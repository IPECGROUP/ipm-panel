// src/components/RightNav.jsx
import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, LogOut, X } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { Btn, LinkBtn } from "./ui/Button";
import { hasLimitedPageAccess } from "../utils/pageAccess";

const iconMaskCls = "nav-icon block h-5 w-5 shrink-0 bg-white pointer-events-none select-none";
const svgCls = "h-5 w-5 block m-0 pointer-events-none select-none";

const NavIcon = ({ src }) => (
  <span
    className={iconMaskCls}
    aria-hidden="true"
    style={{
      WebkitMask: `url(${src}) center / contain no-repeat`,
      mask: `url(${src}) center / contain no-repeat`,
    }}
  />
);

const IcDashboard = () => <NavIcon src="/images/icons/dashbaord.svg" />;
const IcLetter = () => <NavIcon src="/images/icons/nameha.svg" />;
const IcProjects = () => <NavIcon src="/images/icons/modiriat-projects.svg" />;
const IcBudget = () => <NavIcon src="/images/icons/modiriat-mali.svg" />;
const IcBase = () => <NavIcon src="/images/icons/atelaatpaye.svg" />;
const IcCurrency = () => <NavIcon src="/images/icons/arz.svg" />;
const IcContract = () => <NavIcon src="/images/icons/gharadad.svg" />;
const IcTags = () => <NavIcon src="/images/icons/tags.svg" />;
const IcWorksheet = () => <NavIcon src="/images/icons/karbarg-mali.svg" />;
const IcDaily = () => <NavIcon src="/images/icons/roznegar.svg" />;
const IcQuality = () => <NavIcon src="/images/icons/modiritkeyfiat.svg" />;
const IcCostBreakdown = () => <NavIcon src="/images/icons/sakhtar-shekast.svg" />;
const IcFinancialCommitments = () => <NavIcon src="/images/icons/masaref-mali.svg" />;
const IcProjectDashboard = () => <NavIcon src="/images/icons/dashboard-modirirat.svg" />;
const IcPaymentRequest = () => <NavIcon src="/images/icons/darkhast-pardakht.svg" />;
const IcTenkhah = () => <NavIcon src="/images/icons/tenkhah.svg" />;
const IcLiquidity = () => <NavIcon src="/images/icons/modiriat-nagdinegi.svg" />;
const IcCashForecast = () => <NavIcon src="/images/icons/pishbini-naghdi.svg" />;
const IcSupply = () => <NavIcon src="/images/icons/modirat-taminposhtibami.svg" />;
const IcSupplyRequest = () => <NavIcon src="/images/icons/darkhast-tamin.svg" />;
const IcOperations = () => <NavIcon src="/images/icons/modriat-amaliat.svg" />;
const IcClose = () => <X className="h-5 w-5" strokeWidth={2.4} />;

function RightNav() {
  const auth = useAuth() || {};
  const { user, logout } = auth;
  const { pathname } = useLocation();
  const navRef = useRef(null);

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

  const [expanded, setExpanded] = useState(() => {
    try {
      return localStorage.getItem("nav_expanded") !== "false";
    } catch {
      return true;
    }
  });

  const [open, setOpen] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("nav_open") || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    document.documentElement.style.setProperty("--right-nav-space", "96px");
  }, []);

  const toggleExpanded = () =>
    setExpanded((curr) => {
      const next = !curr;
      localStorage.setItem("nav_expanded", String(next));
      return next;
    });

  const toggle = (key) =>
    setOpen((curr) => {
      const willOpen = !curr[key];
      const next = willOpen ? { [key]: true } : {};
      localStorage.setItem("nav_open", JSON.stringify(next));
      return next;
    });

  const closeOpenMenus = () =>
    setOpen((curr) => {
      if (!Object.values(curr).some(Boolean)) return curr;
      localStorage.setItem("nav_open", "{}");
      return {};
    });

  const hasOpenMenu = Object.values(open).some(Boolean);

  useEffect(() => {
    if (!expanded && !hasOpenMenu) return undefined;

    const closeOnOutsideClick = (event) => {
      if (navRef.current?.contains(event.target)) return;
      localStorage.setItem("nav_open", "{}");
      setOpen({});
      if (expanded) {
        localStorage.setItem("nav_expanded", "false");
        setExpanded(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [expanded, hasOpenMenu]);

  const sectionFromPath = (p) => {
    const path = clean(p);

    if (
      path.startsWith("/budget/") ||
      path.startsWith("/finance/") ||
      path === "/budget-allocation" ||
      path === "/payment" ||
      path === "/requests" ||
      path === "/budget/reports"
    ) {
      return "budget";
    }

    if (path.startsWith("/supply/")) {
      return "supply";
    }

    if (path.startsWith("/operations/")) {
      return "operations";
    }

    if (path.startsWith("/base/") || path === "/centers/projects" || path.startsWith("/admin/")) {
      return "base";
    }

    if (path.startsWith("/projects/")) {
      return "projects";
    }

    if (path.startsWith("/contracts/") || path === "/centers/contract-info") {
      return "contracts";
    }

    return null;
  };

  const activeSection = sectionFromPath(pNow);
  const dashboardActive = isActive("/") || isActive("/dashboard");
  const projectsParentActive = !!open.projects || activeSection === "projects";
  const contractsParentActive = !!open.contracts || activeSection === "contracts";
  const budgetParentActive = !!open.budget || activeSection === "budget";
  const supplyParentActive = !!open.supply || activeSection === "supply";
  const operationsParentActive = !!open.operations || activeSection === "operations";
  const baseParentActive = !!open.base || activeSection === "base";

  const [tip, setTip] = useState({ show: false, y: 0, label: "" });
  const canHover =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const showTip = (label, e) => {
    if (!canHover || expanded) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTip({ show: true, y: rect.top + rect.height / 2, label });
  };

  const hideTip = () => setTip({ show: false, y: 0, label: "" });

  const navGroups = hasLimitedPageAccess(user) ? [
    {
      title: "اصلی",
      items: [
        { type: "link", to: "/", label: "داشبورد", icon: <IcDashboard />, active: dashboardActive },
        {
          type: "section",
          key: "budget",
          label: "مدیریت مالی",
          icon: <IcBudget />,
          active: budgetParentActive,
          items: [
            { to: "/finance/payment-request", label: "درخواست پرداخت", hint: "ثبت و پیگیری درخواست پرداخت", icon: <IcPaymentRequest /> },
            { to: "/finance/tenkhah", label: "تنخواه", hint: "مدیریت تنخواه", icon: <IcTenkhah /> },
          ],
        },
        {
          type: "section",
          key: "supply",
          label: "مدیریت تامین",
          icon: <IcSupply />,
          active: supplyParentActive,
          items: [
            { to: "/supply/request", label: "درخواست تامین", hint: "ثبت و پیگیری درخواست تامین", icon: <IcSupplyRequest /> },
          ],
        },
      ],
    },
  ] : [
    {
      title: "اصلی",
      items: [
        { type: "link", to: "/", label: "داشبورد", icon: <IcDashboard />, active: dashboardActive },
        { type: "link", to: "/letters", label: "مدیریت اسناد", icon: <IcLetter />, active: isActive("/letters") },
        {
          type: "section",
          key: "contracts",
          label: "مدیریت قراردادها",
          icon: <IcContract />,
          active: contractsParentActive,
          items: [
            { to: "/contracts/info", label: "قراردادها", hint: "ثبت و مدیریت اطلاعات قراردادها", icon: <IcContract /> },
            { to: "/contracts/management-dashboard", label: "داشبورد مدیریت قراردادها", hint: "نمای کلی وضعیت قراردادها", icon: <IcProjectDashboard /> },
          ],
        },
        {
          type: "section",
          key: "projects",
          label: "مدیریت پروژه ها",
          icon: <IcProjects />,
          active: projectsParentActive,
          items: [
            { to: "/projects/daily-log", label: "روزنگار پروژه", hint: "ثبت گزارش های روزانه", icon: <IcDaily /> },
            { to: "/projects/cost-breakdown", label: "ساختار شکست هزینه ها", hint: "ساختار و اجزای هزینه پروژه", icon: <IcCostBreakdown /> },
            { to: "/projects/financial-commitments", label: "تعهدات و مصارف مالی", hint: "تعهدات و مصرف های پروژه", icon: <IcFinancialCommitments /> },
            { to: "/projects/financial-worksheet", label: "کاربرگ مالی", hint: "جزئیات مالی پروژه", icon: <IcWorksheet /> },
            { to: "/projects/project-management-dashboard", label: "داشبورد مدیریت پروژه", hint: "نمای کلی وضعیت پروژه", icon: <IcProjectDashboard /> },
          ],
        },
      ],
    },
    {
      title: "مدیریت مالی",
      items: [
        {
          type: "section",
          key: "budget",
          label: "مدیریت مالی",
          icon: <IcBudget />,
          active: budgetParentActive,
          items: [
            { to: "/finance/payment-request", label: "درخواست پرداخت", hint: "ثبت و پیگیری درخواست پرداخت", icon: <IcPaymentRequest /> },
            { to: "/finance/tenkhah", label: "تنخواه", hint: "مدیریت تنخواه", icon: <IcTenkhah /> },
            { to: "/finance/liquidity-allocation", label: "تخصیص نقدینگی", hint: "مدیریت و توزیع نقدینگی", icon: <IcLiquidity /> },
            { to: "/finance/cash-flow-forecast", label: "پیش بینی جریان نقدی", hint: "برآورد جریان نقدی آینده", icon: <IcCashForecast /> },
            { to: "/finance/financial-management-dashboard", label: "داشبورد مدیریت مالی", hint: "نمای کلی شاخص های مالی", icon: <IcProjectDashboard /> },
          ],
        },
      ],
    },
    {
      title: "مدیریت تامین",
      items: [
        {
          type: "section",
          key: "supply",
          label: "مدیریت تامین",
          icon: <IcSupply />,
          active: supplyParentActive,
          items: [
            { to: "/supply/request", label: "درخواست تامین", hint: "ثبت و پیگیری درخواست تامین", icon: <IcSupplyRequest /> },
            { to: "/supply/dashboard", label: "داشبورد مدیریت تامین", hint: "نمای کلی تامین", icon: <IcProjectDashboard /> },
          ],
        },
      ],
    },
    {
      title: "مدیریت عملیات",
      items: [
        {
          type: "section",
          key: "operations",
          label: "مدیریت عملیات",
          icon: <IcOperations />,
          active: operationsParentActive,
          items: [
            { to: "/operations/equipment", label: "ماشین آلات و تجهیزات", hint: "مدیریت ماشین آلات و تجهیزات", icon: <NavIcon src="/images/icons/tanzimat.svg" /> },
            { to: "/operations/history", label: "سوابق عملیات", hint: "مرور سوابق عملیات", icon: <NavIcon src="/images/icons/gozareshrozane.svg" /> },
          ],
        },
      ],
    },
    {
      title: "مدیریت دانش",
      items: [
        { type: "link", to: "/quality-management", label: "مدیریت دانش", icon: <IcQuality />, active: isActive("/quality-management") },
      ],
    },
    {
      title: "تنظیمات",
      items: [
        {
          type: "section",
          key: "base",
          label: "تنظیمات",
          icon: <IcBase />,
          active: baseParentActive,
          items: [
            { to: "/base/units", label: "ساختار سازمانی", hint: "واحدها، نقش ها و کاربران", icon: <NavIcon src="/images/icons/unit.svg" /> },
            { to: "/base/access-management", label: "مدیریت دسترسی‌ها", icon: <NavIcon src="/images/icons/dastresiha.svg" /> },
            { to: "/centers/projects", label: "پروژه ها", hint: "تعریف و ویرایش پروژه ها", icon: <IcProjects /> },
            { to: "/base/currencies", label: "ارزها", hint: "نرخ ها و واحدهای پولی", icon: <IcCurrency /> },
            { to: "/base/tags", label: "برچسب ها", hint: "دسته بندی داده ها", icon: <IcTags /> },
          ],
        },
      ],
    },
  ];

  const mobileMenuKey = open.projects
    ? "projects"
    : open.contracts
      ? "contracts"
    : open.budget
      ? "budget"
      : open.supply
        ? "supply"
        : open.operations
          ? "operations"
          : open.base
            ? "base"
            : null;
  const mobileMenu = navGroups
    .flatMap((group) => group.items)
    .find((item) => item.type === "section" && item.key === mobileMenuKey);

  const closeMobileMenu = () =>
    setOpen(() => {
      localStorage.setItem("nav_open", "{}");
      return {};
    });

  const displayName = user?.name || user?.username || user?.email || "کاربر";
  const displayRole = user?.role ? String(user.role) : "کاربر سامانه";
  const initials = String(displayName).trim().slice(0, 1).toUpperCase() || "U";

  const iconShellCls = (active) =>
    [
      "grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white transition",
      active ? "bg-[#DB843D]/20" : "bg-transparent group-hover:bg-white/[0.07]",
    ].join(" ");

  const desktopItemCls = (active, collapsed = false) =>
    [
      "group relative !flex !items-center !border !border-transparent !bg-transparent !shadow-none",
      "!box-border !text-sm !leading-6 !transition-all !duration-200 focus:!ring-2 focus:!ring-[#DB843D]/25",
      collapsed ? "!h-10 !w-10 !justify-center !rounded-xl !px-0 !py-0" : "!min-h-11 !mx-auto !w-[calc(100%-0.75rem)] !justify-start !gap-3 !rounded-lg !px-2.5 !py-1",
      active
        ? "!border-[#DB843D]/[0.55] !bg-[#DB843D]/[0.16] !text-white !font-semibold !ring-1 !ring-inset !ring-[#DB843D]/25 before:absolute before:right-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:bg-[#DB843D]"
        : "!text-white/[0.72] hover:!bg-white/[0.07] hover:!text-white",
    ].join(" ");

  const subItemCls = (active, compact = false) =>
    [
      "group relative !grid !items-center !border !border-transparent !bg-transparent !shadow-none !transition-all !duration-200",
      compact ? "!grid-cols-[2rem_minmax(0,1fr)] !gap-2 !rounded-lg !px-2 !py-2" : "!grid-cols-[2rem_minmax(0,1fr)] !gap-2.5 !rounded-lg !px-2.5 !py-2",
      active
        ? "!border-[#DB843D]/[0.55] !bg-[#DB843D]/[0.16] !text-white !ring-1 !ring-inset !ring-[#DB843D]/25 before:absolute before:right-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:bg-[#DB843D]"
        : "!text-white/[0.72] hover:!bg-white/[0.07] hover:!text-white",
    ].join(" ");

  const mobileHeaderPanelCls =
    "relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#24211F]/[0.95] p-1.5 shadow-[0_14px_36px_rgba(15,23,42,0.24)] backdrop-blur-xl transition-all duration-300";

  const mobileButtonSurface = (active) =>
    active
      ? "!border-[#DB843D]/[0.45] !bg-[#DB843D]/[0.16] !text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_6px_16px_rgba(219,132,61,0.14)]"
      : "!border-white/10 !bg-white/[0.05] !text-white/[0.75] shadow-[0_5px_14px_rgba(15,23,42,0.14)] hover:!bg-white/[0.08] hover:!text-white";

  const mobileDockBtn = (active) =>
    [
      "!h-[3.25rem] sm:!h-[3.55rem] !w-full !min-w-0 !rounded-xl !p-0",
      "!flex !flex-col !items-center !justify-center gap-1 !border transition-all duration-200",
      "[&_svg]:!text-current",
      "active:scale-[0.97]",
      mobileButtonSurface(active),
    ].join(" ");

  const mobileSubItemCls =
    "!grid !grid-cols-[2.55rem_minmax(0,1fr)] sm:!grid-cols-[2.75rem_minmax(0,1fr)] !items-center gap-2.5 " +
    "!min-h-[3.35rem] !rounded-xl !border !border-transparent !bg-transparent !px-2 !py-2 !text-right " +
    "!text-white/80 !shadow-none hover:!bg-white/[0.07] hover:!text-white focus:!ring-2 focus:!ring-[#DB843D]/25 transition-all duration-200 active:scale-[0.985]";

  const renderIcon = (icon, active) => <span className={iconShellCls(active)}>{icon}</span>;

  const renderExpandedSection = (item) => {
    const sectionOpen = !!open[item.key];

    return (
      <div key={item.key} className="space-y-1">
        <button
          type="button"
          className={desktopItemCls(item.active)}
          onClick={() => toggle(item.key)}
          aria-expanded={sectionOpen}
        >
          {renderIcon(item.icon, item.active)}
          <span className="min-w-0 flex-1 truncate py-0.5 text-right leading-6">{item.label}</span>
          <ChevronLeft
            className={[
              "h-4 w-4 shrink-0 text-white/[0.45] transition-transform",
              sectionOpen ? "-rotate-90 text-[#DB843D]" : "",
            ].join(" ")}
            strokeWidth={2.2}
          />
        </button>

        {sectionOpen && (
          <div className="mr-3 space-y-1 border-r border-white/10 pr-3">
            {item.items.map((child) => (
              <LinkBtn
                key={child.to}
                to={child.to}
                onClick={closeOpenMenus}
                className={subItemCls(isActive(child.to))}
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.06] group-hover:bg-white/[0.10]">
                  {child.icon}
                </span>
                <span className="min-w-0 text-right">
                  <span className="block truncate text-[13px] font-medium leading-5">{child.label}</span>
                  <span className="block truncate text-[11px] leading-4 text-white/[0.42]">{child.hint}</span>
                </span>
              </LinkBtn>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderCollapsedSection = (item) => (
    <div key={item.key} className="relative flex w-full justify-center">
      <button
        type="button"
        className={desktopItemCls(item.active, true)}
        onClick={() => toggle(item.key)}
        onMouseEnter={(e) => showTip(item.label, e)}
        onMouseLeave={hideTip}
        aria-label={item.label}
        aria-expanded={!!open[item.key]}
      >
        {renderIcon(item.icon, item.active)}
      </button>

      {open[item.key] && (
        <div className="absolute right-[calc(100%+1rem)] top-0 z-[70] w-64 rounded-xl border border-white/10 bg-[#24211F] p-2 shadow-[0_18px_45px_rgba(0,0,0,0.28)] ring-1 ring-white/[0.04] before:absolute before:-right-4 before:top-0 before:h-full before:w-4 before:content-[''] after:absolute after:-right-1.5 after:top-4 after:h-3 after:w-3 after:rotate-45 after:border-r after:border-t after:border-white/10 after:bg-[#24211F]">
          <div className="px-2 pb-2 pt-1 text-right text-xs font-semibold text-white/50">{item.label}</div>
          <div className="space-y-1">
            {item.items.map((child) => (
              <LinkBtn
                key={child.to}
                to={child.to}
                onClick={closeOpenMenus}
                className={subItemCls(isActive(child.to), true)}
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.06]">
                  {child.icon}
                </span>
                <span className="min-w-0 text-right">
                  <span className="block truncate text-[13px] font-medium leading-5">{child.label}</span>
                  <span className="block truncate text-[11px] leading-4 text-white/[0.42]">{child.hint}</span>
                </span>
              </LinkBtn>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderDesktopItem = (item) => {
    if (item.type === "section") {
      return expanded ? renderExpandedSection(item) : renderCollapsedSection(item);
    }

    return (
      <div key={item.to} onMouseEnter={(e) => showTip(item.label, e)} onMouseLeave={hideTip}>
        <LinkBtn to={item.to} onClick={closeOpenMenus} className={desktopItemCls(item.active, !expanded)} aria-label={item.label}>
          {renderIcon(item.icon, item.active)}
          {expanded && <span className="min-w-0 flex-1 truncate py-0.5 text-right leading-6">{item.label}</span>}
        </LinkBtn>
      </div>
    );
  };

  return (
    <>
      <aside
        ref={navRef}
        dir="rtl"
        className={[
          "hidden lg:flex fixed right-4 top-4 bottom-4 z-[200] flex-col rounded-2xl border border-white/10 bg-[#24211F]/[0.96] text-white",
          "shadow-[0_18px_50px_rgba(0,0,0,0.26)] backdrop-blur-xl transition-all duration-300",
          "overflow-visible",
          expanded ? "w-[280px] py-3 pl-5 pr-3" : "w-[76px] px-2.5 py-3",
        ].join(" ")}
      >
        <div className={["flex items-center", expanded ? "justify-start px-1" : "justify-center"].join(" ")}>
          {expanded && (
            <button
              type="button"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.06] text-white/70 transition hover:bg-white/[0.10] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#DB843D]/25"
              onClick={toggleExpanded}
              aria-label="جمع کردن منو"
            >
              <ChevronRight className={svgCls} strokeWidth={2.2} />
            </button>
          )}
        </div>

        {!expanded && (
          <button
            type="button"
            className="mx-auto mt-3 grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.06] text-white/70 transition hover:bg-white/[0.10] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#DB843D]/25"
            onClick={toggleExpanded}
            aria-label="باز کردن منو"
          >
            <ChevronLeft className={svgCls} strokeWidth={2.2} />
          </button>
        )}

        <div className={["mt-5 min-h-0 flex-1 space-y-4", expanded ? "ipm-right-nav-scroll overflow-y-auto overflow-x-visible px-0.5" : "overflow-visible"].join(" ")}>
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1.5">
              <div className={["space-y-1.5", expanded ? "" : "flex flex-col items-center"].join(" ")}>
                {group.items.map(renderDesktopItem)}
              </div>
            </div>
          ))}
        </div>

        <div className={["border-t border-white/10 pt-3", expanded ? "mt-3" : "mt-4"].join(" ")}>
          {expanded ? (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] p-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.08] text-sm font-bold text-white shadow-sm">
                {initials}
              </span>
              <span className="min-w-0 flex-1 text-right">
                <span className="block truncate text-xs font-bold text-white">{displayName}</span>
              <span className="block truncate text-[11px] leading-4 text-white/[0.45]">{displayRole}</span>
              </span>
              <button
                type="button"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/50 transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#DB843D]/25"
                onClick={logout || (() => {})}
                aria-label="خروج"
              >
                <LogOut className={svgCls} strokeWidth={2.1} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="mx-auto grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-sm font-bold text-white transition hover:bg-white/[0.10] focus:outline-none focus:ring-2 focus:ring-[#DB843D]/25"
              onClick={logout || (() => {})}
              onMouseEnter={(e) => showTip(displayName, e)}
              onMouseLeave={hideTip}
              aria-label={displayName}
            >
              {initials}
            </button>
          )}
        </div>
      </aside>

      {mobileMenu && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/[0.03] lg:hidden"
          aria-label="بستن منو"
          onClick={closeMobileMenu}
        />
      )}

      <nav
        dir="rtl"
        className="fixed inset-x-0 bottom-0 z-[200] lg:hidden pointer-events-none px-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4"
        aria-label="منوی اصلی"
      >
        <div className="pointer-events-auto mx-auto flex max-w-[29rem] flex-col items-center gap-2 sm:max-w-[35rem] md:max-w-[40rem]">
          {mobileMenu && (
            <div className={`${mobileHeaderPanelCls} max-h-[min(58dvh,390px)]`}>
              <div className="relative z-[3] grid max-h-[min(48dvh,310px)] grid-cols-1 gap-0.5 overflow-y-auto rounded-xl sm:grid-cols-2 sm:gap-x-2">
                {mobileMenu.items.map((item) => (
                  <LinkBtn
                    key={item.to}
                    to={item.to}
                    onClick={closeMobileMenu}
                    className={[mobileSubItemCls, isActive(item.to) ? "!border-[#DB843D]/[0.45] !bg-[#DB843D]/[0.16] !text-white !ring-1 !ring-inset !ring-[#DB843D]/25" : ""].join(" ")}
                  >
                    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                      {item.icon}
                    </span>
                    <span className="relative min-w-0">
                      <span className="block truncate text-sm font-bold leading-5 text-current sm:text-[15px]">
                        {item.label}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] leading-4 text-white/[0.45] sm:text-xs">
                        {item.hint}
                      </span>
                    </span>
                  </LinkBtn>
                ))}
              </div>
            </div>
          )}

          <div className={mobileHeaderPanelCls}>
            <div className="relative z-[3] grid grid-cols-4 items-center gap-1.5 sm:gap-2">
              <LinkBtn to="/" onClick={closeMobileMenu} className={mobileDockBtn(dashboardActive)} aria-label="داشبورد">
                <IcDashboard />
                <span className="max-w-full truncate px-0.5 text-[9px] font-medium leading-none text-current sm:text-[11px]">
                  داشبورد
                </span>
              </LinkBtn>

              <LinkBtn
                to="/letters"
                onClick={closeMobileMenu}
                className={mobileDockBtn(isActive("/letters"))}
                aria-label="مدیریت اسناد"
              >
                <IcLetter />
                <span className="max-w-full truncate px-0.5 text-[9px] font-medium leading-none text-current sm:text-[11px]">
                  مدیریت اسناد
                </span>
              </LinkBtn>

              <Btn
                type="button"
                className={mobileDockBtn(contractsParentActive)}
                onClick={() => toggle("contracts")}
                aria-label="مدیریت قراردادها"
              >
                {open.contracts ? <IcClose /> : <IcContract />}
                <span className="max-w-full truncate px-0.5 text-[9px] font-medium leading-none text-current sm:text-[11px]">
                  قراردادها
                </span>
              </Btn>

              <Btn
                type="button"
                className={mobileDockBtn(projectsParentActive)}
                onClick={() => toggle("projects")}
                aria-label="مدیریت پروژه ها"
              >
                {open.projects ? <IcClose /> : <IcProjects />}
                <span className="max-w-full truncate px-0.5 text-[9px] font-medium leading-none text-current sm:text-[11px]">
                  پروژه ها
                </span>
              </Btn>

              <Btn
                type="button"
                className={mobileDockBtn(budgetParentActive)}
                onClick={() => toggle("budget")}
                aria-label="مدیریت مالی"
              >
                {open.budget ? <IcClose /> : <IcBudget />}
                <span className="max-w-full truncate px-0.5 text-[9px] font-medium leading-none text-current sm:text-[11px]">
                  مالی
                </span>
              </Btn>

              <Btn
                type="button"
                className={mobileDockBtn(supplyParentActive)}
                onClick={() => toggle("supply")}
                aria-label="مدیریت تامین"
              >
                {open.supply ? <IcClose /> : <IcSupply />}
                <span className="max-w-full truncate px-0.5 text-[9px] font-medium leading-none text-current sm:text-[11px]">
                  تامین
                </span>
              </Btn>

              <Btn
                type="button"
                className={mobileDockBtn(operationsParentActive)}
                onClick={() => toggle("operations")}
                aria-label="مدیریت عملیات"
              >
                {open.operations ? <IcClose /> : <IcOperations />}
                <span className="max-w-full truncate px-0.5 text-[9px] font-medium leading-none text-current sm:text-[11px]">
                  عملیات
                </span>
              </Btn>

              <LinkBtn
                to="/quality-management"
                onClick={closeMobileMenu}
                className={mobileDockBtn(isActive("/quality-management"))}
                aria-label="مدیریت دانش"
              >
                <IcQuality />
                <span className="max-w-full truncate px-0.5 text-[9px] font-medium leading-none text-current sm:text-[11px]">
                  مدیریت دانش
                </span>
              </LinkBtn>

              <Btn
                type="button"
                className={mobileDockBtn(baseParentActive)}
                onClick={() => toggle("base")}
                aria-label="تنظیمات"
              >
                {open.base ? <IcClose /> : <IcBase />}
                <span className="max-w-full truncate px-0.5 text-[9px] font-medium leading-none text-current sm:text-[11px]">
                  تنظیمات
                </span>
              </Btn>
            </div>
          </div>
        </div>
      </nav>

      {canHover && tip.show && (
        <div
          className="fixed z-[210] pointer-events-none rounded-lg border border-white/10 bg-[#24211F] px-3 py-1.5 text-xs text-white/80 shadow-lg whitespace-nowrap"
          style={{ top: tip.y, right: "92px", transform: "translateY(-50%)" }}
        >
          {tip.label}
        </div>
      )}
    </>
  );
}

export default React.memo(RightNav);
