// src/components/RightNav.jsx
import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { isMainAdminUser } from "../utils/auth";
import { Btn, LinkBtn } from "./ui/Button";

const icImgCls = "w-5 h-5 block m-0 filter invert pointer-events-none select-none";
const svgCls = "w-5 h-5 block m-0 text-white pointer-events-none select-none";
const sw = 2.2;

const IcDashboard = () => <img src="/images/icons/dashbaord.svg" className={icImgCls} alt="" draggable={false} />;
const IcPay = () => <img src="/images/icons/darkastpardakht.svg" className={icImgCls} alt="" draggable={false} />;
const IcLetter = () => <img src="/images/icons/nameha.svg" className={icImgCls} alt="" draggable={false} />;
const IcProjects = () => <img src="/images/icons/project.svg" className={icImgCls} alt="" draggable={false} />;
const IcBudget = () => <img src="/images/icons/busgebandi.svg" className={icImgCls} alt="" draggable={false} />;
const IcBase = () => <img src="/images/icons/atelaatpaye.svg" className={icImgCls} alt="" draggable={false} />;
const IcCurrency = () => <img src="/images/icons/arz.svg" className={icImgCls} alt="" draggable={false} />;
const IcUsers = () => <img src="/images/icons/users.svg" className={icImgCls} alt="" draggable={false} />;
const IcContract = () => <img src="/images/icons/gharadad.svg" className={icImgCls} alt="" draggable={false} />;
const IcTags = () => <img src="/images/icons/tags.svg" className={icImgCls} alt="" draggable={false} />;

const IcWorksheet = () => (
  <svg viewBox="0 0 24 24" className={svgCls} fill="none" stroke="currentColor" strokeWidth={sw}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M8 4v16M3 10h18" />
  </svg>
);

const IcDaily = () => <img src="/images/icons/calendar.svg" className={icImgCls} alt="" draggable={false} />;
const IcClose = () => <X className={svgCls} strokeWidth={2.4} />;

function RightNav() {
  const { user } = useAuth();
  const isMainAdmin = isMainAdminUser(user);
  const { pathname } = useLocation();

  const clean = (p) => (p || "").replace(/\/+$/, "") || "/";
  const base = (import.meta?.env?.BASE_URL || "/").replace(/\/+$/, "");

  const stripBase = (p) => {
    const cp = clean(p);
    if (!base || base === "/" || base === "") return cp;
    return cp.startsWith(base) ? clean(cp.slice(base.length) || "/") : cp;
  };

  const pNow = stripBase(pathname);

  const isActive = (to) => {
    const p = clean(pNow);
    const t = clean(stripBase(to));
    return p === t || (t !== "/" && p.startsWith(`${t}/`));
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

  const sectionFromPath = (p) => {
    const path = clean(p);

    if (
      path.startsWith("/budget/") ||
      path === "/estimates" ||
      path === "/revenue-estimates" ||
      path === "/budget-allocation" ||
      path === "/budget/reports"
    ) {
      return "budget";
    }

    if (path.startsWith("/base/") || path === "/centers/projects" || path.startsWith("/admin/")) {
      return "base";
    }

    if (path.startsWith("/centers/contract-info") || path.startsWith("/projects/")) {
      return "projects";
    }

    return null;
  };

  const activeSection = sectionFromPath(pNow);

  const railBtn = (active) =>
    [
      "group w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 border transition-all duration-200 p-0 mx-auto",
      "flex items-center justify-center cursor-pointer select-none touch-manipulation",
      "focus:outline-none focus:ring-0",
      active
        ? "!bg-[#F48B35] !border-[#F48B35] !text-neutral-900"
        : "bg-neutral-900/90 text-white/90 border-neutral-800 hover:bg-[#f5882c] hover:border-[#f5882c] dark:bg-neutral-800/90 dark:text-neutral-100 dark:border-neutral-700",
    ].join(" ");

  const [tip, setTip] = useState({ show: false, y: 0, label: "" });
  const canHover =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const showTip = (label, e) => {
    if (!canHover) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTip({ show: true, y: rect.top + rect.height / 2, label });
  };

  const hideTip = () => setTip({ show: false, y: 0, label: "" });

  const RailDivider = () => (
    <div className="my-2 h-px bg-neutral-800/60 dark:bg-neutral-700/60 w-8 sm:w-10 mx-auto" />
  );

  const projectsParentActive = !!open.projects || activeSection === "projects";
  const budgetParentActive = !!open.budget || activeSection === "budget";
  const baseParentActive = !!open.base || activeSection === "base";
  const dashboardActive = isActive("/") || isActive("/dashboard");

  const closeMobileMenu = () =>
    setOpen(() => {
      localStorage.setItem("nav_open", "{}");
      return {};
    });

  const mobileHeaderPanelCls =
    "relative w-full overflow-hidden rounded-[1.35rem] border border-black/10 bg-white/75 " +
    "p-1.5 shadow-[0_10px_24px_rgba(0,0,0,0.18)] backdrop-blur transition-all duration-300 " +
    "before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-l before:from-black/5 before:to-transparent " +
    "min-[390px]:rounded-[1.55rem] min-[390px]:p-2 dark:border-white/10 dark:bg-neutral-900/70 dark:before:from-white/10";

  const mobileDockBtn = (active) =>
    [
      "!h-[3.3rem] min-[390px]:!h-[3.45rem] sm:!h-[3.65rem] !w-full !min-w-0 !rounded-[1.05rem] min-[390px]:!rounded-[1.15rem] !p-0",
      "!flex !flex-col !items-center !justify-center gap-1 !border transition-all duration-200",
      "[&_img]:!filter-none [&_svg]:!text-neutral-950 dark:[&_img]:!invert dark:[&_svg]:!text-white",
      "active:scale-[0.96]",
      active
        ? "!border-black/10 !bg-white/70 !text-neutral-950 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55),0_6px_16px_rgba(0,0,0,0.10)] dark:!border-white/15 dark:!bg-white/10 dark:!text-white"
        : "!border-transparent !bg-transparent !text-neutral-800 hover:!bg-white/55 dark:!text-white/85 dark:hover:!bg-white/10",
    ].join(" ");

  const mobileSubItemCls =
    "!grid !grid-cols-[2.65rem_minmax(0,1fr)] sm:!grid-cols-[2.85rem_minmax(0,1fr)] !items-center gap-2.5 " +
    "!min-h-[3.45rem] !rounded-xl !border !border-transparent !bg-transparent !px-2 !py-2 !text-right !text-neutral-900 " +
    "!shadow-none transition-all duration-200 hover:!bg-black/[0.035] active:scale-[0.985] " +
    "dark:!text-white [&_img]:!filter-none [&_svg]:!text-neutral-950 dark:[&_img]:!invert dark:[&_svg]:!text-white";

  const mobileSubIconCls =
    "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11";

  const mobileMenuKey = open.projects ? "projects" : open.budget ? "budget" : open.base ? "base" : null;
  const mobileMenus = {
    projects: {
      title: "پروژه‌ها",
      items: [
        { to: "/centers/contract-info", label: "قراردادها", hint: "اطلاعات و پیگیری قراردادها", icon: <IcContract /> },
        { to: "/projects/financial-worksheet", label: "کاربرگ مالی", hint: "جزئیات مالی پروژه", icon: <IcWorksheet /> },
        { to: "/projects/daily-log", label: "روزنگار پروژه", hint: "ثبت گزارش‌های روزانه", icon: <IcDaily /> },
      ],
    },
    budget: {
      title: "بودجه‌بندی",
      items: [
        {
          to: "/estimates",
          label: "برآورد هزینه‌ها",
          hint: "پیش‌بینی و کنترل هزینه",
          icon: <img src="/images/icons/baravord.svg" className={icImgCls} alt="" draggable={false} />,
        },
        {
          to: "/revenue-estimates",
          label: "برآورد درآمد",
          hint: "پیش‌بینی جریان درآمد",
          icon: <img src="/images/icons/baravordhazine.svg" className={icImgCls} alt="" draggable={false} />,
        },
        {
          to: "/budget-allocation",
          label: "تخصیص بودجه",
          hint: "تقسیم منابع بودجه‌ای",
          icon: <img src="/images/icons/taksisbodge.svg" className={icImgCls} alt="" draggable={false} />,
        },
        {
          to: "/budget/reports",
          label: "گزارش‌ها",
          hint: "خلاصه‌ها و خروجی‌ها",
          icon: <img src="/images/icons/gozareshha.svg" className={icImgCls} alt="" draggable={false} />,
        },
      ],
    },
    base: {
      title: "اطلاعات پایه",
      items: [
        {
          to: "/base/units",
          label: "ساختار سازمانی",
          hint: "واحدها و چارت سازمانی",
          icon: <img src="/images/icons/unit.svg" className={icImgCls} alt="" draggable={false} />,
        },
        ...(isMainAdmin ? [{ to: "/admin/users", label: "کاربران", hint: "مدیریت دسترسی‌ها", icon: <IcUsers /> }] : []),
        { to: "/centers/projects", label: "پروژه‌ها", hint: "تعریف و ویرایش پروژه‌ها", icon: <IcProjects /> },
        { to: "/base/currencies", label: "ارزها", hint: "نرخ‌ها و واحدهای پولی", icon: <IcCurrency /> },
        { to: "/base/tags", label: "برچسب‌ها", hint: "دسته‌بندی داده‌ها", icon: <IcTags /> },
      ],
    },
  };
  const mobileMenu = mobileMenuKey ? mobileMenus[mobileMenuKey] : null;

  return (
    <>
      <aside
        dir="rtl"
        className="hidden lg:block fixed right-0 top-0 bottom-0 z-50 w-[64px] sm:w-[76px] lg:w-[92px] rounded-none
                   bg-neutral-900/85 backdrop-blur-xl border-s border-neutral-800 shadow-2xl
                   px-1.5 sm:px-2 lg:px-3 overflow-y-auto overscroll-contain
                   pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="h-full flex flex-col items-center gap-2">
          <div onMouseEnter={(e) => showTip("داشبورد", e)} onMouseLeave={hideTip}>
            <LinkBtn to="/" className={railBtn(dashboardActive)} aria-label="داشبورد">
              <IcDashboard />
            </LinkBtn>
          </div>

          <div onMouseEnter={(e) => showTip("اسناد و نامه ها", e)} onMouseLeave={hideTip}>
            <LinkBtn to="/letters" className={railBtn(isActive("/letters"))} aria-label="اسناد و نامه ها">
              <IcLetter />
            </LinkBtn>
          </div>

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
            <div className="ms-1 sm:ms-2 mt-2 flex flex-col items-stretch gap-2">
              <div onMouseEnter={(e) => showTip("قراردادها", e)} onMouseLeave={hideTip}>
                <LinkBtn
                  to="/centers/contract-info"
                  className={railBtn(isActive("/centers/contract-info"))}
                  aria-label="قراردادها"
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

          <div onMouseEnter={(e) => showTip("درخواست پرداخت", e)} onMouseLeave={hideTip}>
            <LinkBtn to="/payment" className={railBtn(isActive("/payment"))} aria-label="درخواست پرداخت">
              <IcPay />
            </LinkBtn>
          </div>

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
            <div className="ms-1 sm:ms-2 mt-2 flex flex-col items-stretch gap-2">
              <div onMouseEnter={(e) => showTip("برآورد هزینه‌ها", e)} onMouseLeave={hideTip}>
                <LinkBtn to="/estimates" className={railBtn(isActive("/estimates"))}>
                  <img src="/images/icons/baravord.svg" className={icImgCls} alt="" draggable={false} />
                </LinkBtn>
              </div>

              <div onMouseEnter={(e) => showTip("برآورد درآمد", e)} onMouseLeave={hideTip}>
                <LinkBtn to="/revenue-estimates" className={railBtn(isActive("/revenue-estimates"))}>
                  <img src="/images/icons/baravordhazine.svg" className={icImgCls} alt="" draggable={false} />
                </LinkBtn>
              </div>

              <div onMouseEnter={(e) => showTip("تخصیص بودجه", e)} onMouseLeave={hideTip}>
                <LinkBtn to="/budget-allocation" className={railBtn(isActive("/budget-allocation"))}>
                  <img src="/images/icons/taksisbodge.svg" className={icImgCls} alt="" draggable={false} />
                </LinkBtn>
              </div>

              <div onMouseEnter={(e) => showTip("گزارش‌ها", e)} onMouseLeave={hideTip}>
                <LinkBtn to="/budget/reports" className={railBtn(isActive("/budget/reports"))}>
                  <img src="/images/icons/gozareshha.svg" className={icImgCls} alt="" draggable={false} />
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
            <div className="ms-1 sm:ms-2 mt-2 flex flex-col items-stretch gap-2">
              <div onMouseEnter={(e) => showTip("ساختار سازمانی", e)} onMouseLeave={hideTip}>
                <LinkBtn to="/base/units" className={railBtn(isActive("/base/units"))}>
                  <img src="/images/icons/unit.svg" className={icImgCls} alt="" draggable={false} />
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

              <div onMouseEnter={(e) => showTip("برچسب‌ها", e)} onMouseLeave={hideTip}>
                <LinkBtn to="/base/tags" className={railBtn(isActive("/base/tags"))}>
                  <IcTags />
                </LinkBtn>
              </div>
            </div>
          )}
        </div>
      </aside>

      {mobileMenu && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/[0.02] lg:hidden"
          aria-label="بستن منو"
          onClick={closeMobileMenu}
        />
      )}

      <nav
        dir="rtl"
        className="fixed inset-x-0 bottom-0 z-50 lg:hidden pointer-events-none px-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] min-[390px]:px-3 sm:px-4"
        aria-label="منوی اصلی"
      >
        <div className="pointer-events-auto mx-auto flex max-w-[29rem] flex-col items-center gap-2 min-[390px]:gap-2.5 sm:max-w-[35rem] md:max-w-[40rem]">
          <div
            className={[
              "w-full origin-bottom overflow-hidden px-1 transition-all duration-300 ease-out will-change-[transform,opacity,max-height]",
              mobileMenu
                ? "max-h-[min(62dvh,430px)] translate-y-0 scale-100 opacity-100"
                : "max-h-0 translate-y-4 scale-[0.97] opacity-0 pointer-events-none",
            ].join(" ")}
          >
            {mobileMenu && (
              <div className={`${mobileHeaderPanelCls} max-h-[min(58dvh,390px)]`}>
                <div className="relative z-[3] grid max-h-[min(48dvh,310px)] grid-cols-1 gap-0.5 overflow-y-auto rounded-[1.05rem] min-[390px]:rounded-[1.2rem] sm:grid-cols-2 sm:gap-x-2">
                  {mobileMenu.items.map((item) => (
                    <LinkBtn
                      key={item.to}
                      to={item.to}
                      onClick={closeMobileMenu}
                      className={[
                        mobileSubItemCls,
                        isActive(item.to)
                          ? "!bg-transparent !shadow-[inset_3px_0_0_rgba(244,139,53,0.95)]"
                          : "",
                      ].join(" ")}
                    >
                      <span className={mobileSubIconCls}>
                        {item.icon}
                      </span>
                      <span className="relative min-w-0">
                        <span className="block truncate text-sm font-bold leading-5 text-neutral-950 sm:text-[15px]">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] leading-4 text-neutral-700/90 sm:text-xs">
                          {item.hint}
                        </span>
                      </span>
                    </LinkBtn>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={mobileHeaderPanelCls}>
            <div className="relative z-[3] grid grid-cols-6 items-center gap-1.5 min-[390px]:gap-2">
              <LinkBtn to="/" onClick={closeMobileMenu} className={mobileDockBtn(dashboardActive)} aria-label="داشبورد">
                <IcDashboard />
                <span className="max-w-full truncate px-0.5 text-[9px] font-medium leading-none text-current min-[390px]:text-[10px] sm:text-[11px]">
                  داشبورد
                </span>
              </LinkBtn>

              <LinkBtn
                to="/letters"
                onClick={closeMobileMenu}
                className={mobileDockBtn(isActive("/letters"))}
                aria-label="اسناد و نامه ها"
              >
                <IcLetter />
                <span className="max-w-full truncate px-0.5 text-[9px] font-medium leading-none text-current min-[390px]:text-[10px] sm:text-[11px]">
                  نامه‌ها
                </span>
              </LinkBtn>

              <Btn
                type="button"
                className={mobileDockBtn(projectsParentActive)}
                onClick={() => toggle("projects")}
                aria-label="پروژه‌ها"
              >
                {open.projects ? <IcClose /> : <IcProjects />}
                <span className="max-w-full truncate px-0.5 text-[9px] font-medium leading-none text-current min-[390px]:text-[10px] sm:text-[11px]">
                  پروژه
                </span>
              </Btn>

              <LinkBtn
                to="/payment"
                onClick={closeMobileMenu}
                className={mobileDockBtn(isActive("/payment"))}
                aria-label="درخواست پرداخت"
              >
                <IcPay />
                <span className="max-w-full truncate px-0.5 text-[9px] font-medium leading-none text-current min-[390px]:text-[10px] sm:text-[11px]">
                  پرداخت
                </span>
              </LinkBtn>

              <Btn
                type="button"
                className={mobileDockBtn(budgetParentActive)}
                onClick={() => toggle("budget")}
                aria-label="بودجه‌بندی"
              >
                {open.budget ? <IcClose /> : <IcBudget />}
                <span className="max-w-full truncate px-0.5 text-[9px] font-medium leading-none text-current min-[390px]:text-[10px] sm:text-[11px]">
                  بودجه
                </span>
              </Btn>

              <Btn
                type="button"
                className={mobileDockBtn(baseParentActive)}
                onClick={() => toggle("base")}
                aria-label="اطلاعات پایه"
              >
                {open.base ? <IcClose /> : <IcBase />}
                <span className="max-w-full truncate px-0.5 text-[9px] font-medium leading-none text-current min-[390px]:text-[10px] sm:text-[11px]">
                  پایه
                </span>
              </Btn>
            </div>
          </div>
        </div>
      </nav>

      {canHover && tip.show && (
        <div
          className="fixed z-[60] pointer-events-none text-xs px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-100 border border-neutral-700 shadow-lg whitespace-nowrap"
          style={{ top: tip.y, right: "clamp(70px, 10vw, 108px)", transform: "translateY(-50%)" }}
        >
          {tip.label}
        </div>
      )}
    </>
  );
}

export default React.memo(RightNav);
