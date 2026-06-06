// src/components/RightNav.jsx
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, LogOut, X } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { isMainAdminUser } from "../utils/auth";
import { Btn, LinkBtn } from "./ui/Button";

const icImgCls = "h-4 w-4 block m-0 object-contain pointer-events-none select-none";
const svgCls = "h-4 w-4 block m-0 pointer-events-none select-none";

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
const IcWorksheet = () => <img src="/images/icons/karbarg-mali.svg" className={icImgCls} alt="" draggable={false} />;
const IcDaily = () => <img src="/images/icons/roznegar.svg" className={icImgCls} alt="" draggable={false} />;
const IcClose = () => <X className="h-4 w-4" strokeWidth={2.4} />;

function RightNav() {
  const auth = useAuth() || {};
  const { user, logout } = auth;
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
    const space = expanded ? "272px" : "96px";
    document.documentElement.style.setProperty("--right-nav-space", space);
  }, [expanded]);

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
  const dashboardActive = isActive("/") || isActive("/dashboard");
  const projectsParentActive = !!open.projects || activeSection === "projects";
  const budgetParentActive = !!open.budget || activeSection === "budget";
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

  const navGroups = [
    {
      title: "اصلی",
      items: [
        { type: "link", to: "/", label: "داشبورد", icon: <IcDashboard />, active: dashboardActive },
        { type: "link", to: "/letters", label: "اسناد و نامه ها", icon: <IcLetter />, active: isActive("/letters") },
        {
          type: "section",
          key: "projects",
          label: "پروژه ها",
          icon: <IcProjects />,
          active: projectsParentActive,
          items: [
            { to: "/centers/contract-info", label: "قراردادها", hint: "اطلاعات و پیگیری قراردادها", icon: <IcContract /> },
            { to: "/projects/financial-worksheet", label: "کاربرگ مالی", hint: "جزئیات مالی پروژه", icon: <IcWorksheet /> },
            { to: "/projects/daily-log", label: "روزنگار پروژه", hint: "ثبت گزارش های روزانه", icon: <IcDaily /> },
          ],
        },
        { type: "link", to: "/payment", label: "درخواست پرداخت", icon: <IcPay />, active: isActive("/payment") },
      ],
    },
    {
      title: "بودجه",
      items: [
        {
          type: "section",
          key: "budget",
          label: "بودجه بندی",
          icon: <IcBudget />,
          active: budgetParentActive,
          items: [
            { to: "/estimates", label: "برآورد هزینه ها", hint: "پیش بینی و کنترل هزینه", icon: <img src="/images/icons/baravord.svg" className={icImgCls} alt="" draggable={false} /> },
            { to: "/revenue-estimates", label: "برآورد درآمد", hint: "پیش بینی جریان درآمد", icon: <img src="/images/icons/baravordhazine.svg" className={icImgCls} alt="" draggable={false} /> },
            { to: "/budget-allocation", label: "تخصیص بودجه", hint: "تقسیم منابع بودجه ای", icon: <img src="/images/icons/taksisbodge.svg" className={icImgCls} alt="" draggable={false} /> },
            { to: "/budget/reports", label: "گزارش ها", hint: "خلاصه ها و خروجی ها", icon: <img src="/images/icons/gozareshha.svg" className={icImgCls} alt="" draggable={false} /> },
          ],
        },
      ],
    },
    {
      title: "اطلاعات پایه",
      items: [
        {
          type: "section",
          key: "base",
          label: "اطلاعات پایه",
          icon: <IcBase />,
          active: baseParentActive,
          items: [
            { to: "/base/units", label: "ساختار سازمانی", hint: "واحدها و چارت سازمانی", icon: <img src="/images/icons/unit.svg" className={icImgCls} alt="" draggable={false} /> },
            ...(isMainAdmin ? [{ to: "/admin/users", label: "کاربران", hint: "مدیریت دسترسی ها", icon: <IcUsers /> }] : []),
            { to: "/centers/projects", label: "پروژه ها", hint: "تعریف و ویرایش پروژه ها", icon: <IcProjects /> },
            { to: "/base/currencies", label: "ارزها", hint: "نرخ ها و واحدهای پولی", icon: <IcCurrency /> },
            { to: "/base/tags", label: "برچسب ها", hint: "دسته بندی داده ها", icon: <IcTags /> },
          ],
        },
      ],
    },
  ];

  const mobileMenuKey = open.projects ? "projects" : open.budget ? "budget" : open.base ? "base" : null;
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
      "grid h-8 w-8 shrink-0 place-items-center rounded-lg transition",
      active ? "bg-[#E7FAFA] text-[#11AEB5] [&_img]:opacity-90" : "bg-transparent text-neutral-500 [&_img]:opacity-55 group-hover:text-neutral-800 group-hover:[&_img]:opacity-85",
    ].join(" ");

  const desktopItemCls = (active, collapsed = false) =>
    [
      "group relative !flex !h-10 !items-center !border !border-transparent !bg-transparent !py-0 !shadow-none",
      "!text-sm !leading-none !transition-all !duration-200 focus:!ring-2 focus:!ring-[#25C3C8]/25",
      collapsed ? "!w-10 !justify-center !rounded-xl !px-0" : "!w-full !justify-start !gap-3 !rounded-lg !px-2.5",
      active
        ? "!bg-[#EAFBFC] !text-[#0FA4AB] !font-semibold before:absolute before:right-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:bg-[#22C4C9]"
        : "!text-neutral-600 hover:!bg-neutral-50 hover:!text-neutral-900",
    ].join(" ");

  const subItemCls = (active, compact = false) =>
    [
      "group relative !grid !items-center !border !border-transparent !bg-transparent !shadow-none !transition-all !duration-200",
      compact ? "!grid-cols-[2rem_minmax(0,1fr)] !gap-2 !rounded-lg !px-2 !py-2" : "!grid-cols-[2rem_minmax(0,1fr)] !gap-2.5 !rounded-lg !px-2.5 !py-2",
      active
        ? "!bg-[#EAFBFC] !text-[#0FA4AB] before:absolute before:right-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:bg-[#22C4C9]"
        : "!text-neutral-600 hover:!bg-neutral-50 hover:!text-neutral-900",
      "[&_img]:opacity-60 hover:[&_img]:opacity-90",
    ].join(" ");

  const mobileHeaderPanelCls =
    "relative w-full overflow-hidden rounded-2xl border border-black/10 bg-white/[0.92] p-1.5 shadow-[0_14px_36px_rgba(15,23,42,0.14)] backdrop-blur-xl transition-all duration-300 dark:border-white/10 dark:bg-neutral-900/[0.92]";

  const mobileButtonSurface = (active) =>
    active
      ? "!border-[#22C4C9]/25 !bg-[#EAFBFC] !text-[#0FA4AB] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.72),0_6px_16px_rgba(34,196,201,0.12)] dark:!border-[#22C4C9]/35 dark:!bg-[#103C40] dark:!text-[#72F2F4]"
      : "!border-black/10 !bg-white !text-neutral-700 shadow-[0_5px_14px_rgba(15,23,42,0.08)] hover:!bg-neutral-50 dark:!border-white/10 dark:!bg-neutral-800 dark:!text-white/85";

  const mobileDockBtn = (active) =>
    [
      "!h-[3.25rem] sm:!h-[3.55rem] !w-full !min-w-0 !rounded-xl !p-0",
      "!flex !flex-col !items-center !justify-center gap-1 !border transition-all duration-200",
      "[&_img]:!filter-none dark:[&_img]:!invert [&_svg]:!text-current",
      "active:scale-[0.97]",
      mobileButtonSurface(active),
    ].join(" ");

  const mobileSubItemCls =
    "!grid !grid-cols-[2.55rem_minmax(0,1fr)] sm:!grid-cols-[2.75rem_minmax(0,1fr)] !items-center gap-2.5 " +
    "!min-h-[3.35rem] !rounded-xl !border !border-transparent !bg-transparent !px-2 !py-2 !text-right " +
    "!text-neutral-900 !shadow-none hover:!bg-neutral-50 focus:!ring-2 focus:!ring-[#25C3C8]/25 transition-all duration-200 active:scale-[0.985] " +
    "dark:!text-white dark:hover:!bg-white/[0.08] [&_img]:!filter-none dark:[&_img]:!invert";

  const renderIcon = (icon, active) => <span className={iconShellCls(active)}>{icon}</span>;

  const renderExpandedSection = (item) => {
    const sectionOpen = open[item.key] || item.active;

    return (
      <div key={item.key} className="space-y-1">
        <button
          type="button"
          className={desktopItemCls(item.active)}
          onClick={() => toggle(item.key)}
          aria-expanded={sectionOpen}
        >
          {renderIcon(item.icon, item.active)}
          <span className="min-w-0 flex-1 truncate text-right">{item.label}</span>
          <ChevronLeft
            className={[
              "h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform",
              sectionOpen ? "-rotate-90 text-[#0FA4AB]" : "",
            ].join(" ")}
            strokeWidth={2.2}
          />
        </button>

        {sectionOpen && (
          <div className="mr-3 space-y-1 border-r border-neutral-100 pr-3">
            {item.items.map((child) => (
              <LinkBtn
                key={child.to}
                to={child.to}
                className={subItemCls(isActive(child.to))}
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-neutral-50 group-hover:bg-white">
                  {child.icon}
                </span>
                <span className="min-w-0 text-right">
                  <span className="block truncate text-[13px] font-medium leading-5">{child.label}</span>
                  <span className="block truncate text-[11px] leading-4 text-neutral-400">{child.hint}</span>
                </span>
              </LinkBtn>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderCollapsedSection = (item) => (
    <div key={item.key} className="relative">
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
        <div className="absolute right-[calc(100%+0.75rem)] top-0 z-[70] w-64 rounded-xl border border-neutral-200 bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
          <div className="px-2 pb-2 pt-1 text-right text-xs font-semibold text-neutral-500">{item.label}</div>
          <div className="space-y-1">
            {item.items.map((child) => (
              <LinkBtn
                key={child.to}
                to={child.to}
                className={subItemCls(isActive(child.to), true)}
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-neutral-50">
                  {child.icon}
                </span>
                <span className="min-w-0 text-right">
                  <span className="block truncate text-[13px] font-medium leading-5">{child.label}</span>
                  <span className="block truncate text-[11px] leading-4 text-neutral-400">{child.hint}</span>
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
        <LinkBtn to={item.to} className={desktopItemCls(item.active, !expanded)} aria-label={item.label}>
          {renderIcon(item.icon, item.active)}
          {expanded && <span className="min-w-0 flex-1 truncate text-right">{item.label}</span>}
        </LinkBtn>
      </div>
    );
  };

  return (
    <>
      <aside
        dir="rtl"
        className={[
          "hidden lg:flex fixed right-4 top-4 bottom-4 z-50 flex-col rounded-2xl border border-neutral-200 bg-white/96 text-neutral-800",
          "shadow-[0_18px_50px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-all duration-300",
          "overflow-visible",
          expanded ? "w-[248px] px-3 py-3" : "w-[76px] px-2.5 py-3",
        ].join(" ")}
      >
        <div className={["flex items-center", expanded ? "justify-between gap-3 px-1" : "justify-center"].join(" ")}>
          <div className={["flex min-w-0 items-center", expanded ? "gap-2.5" : ""].join(" ")}>
            <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50">
              <img src="/images/light%20mode.png" alt="logo" className="h-7 w-7 object-contain" draggable={false} />
            </span>
            {expanded && (
              <span className="min-w-0 text-right">
                <span className="block truncate text-sm font-bold text-neutral-900">IPM Panel</span>
                <span className="block truncate text-[11px] leading-4 text-neutral-400">مدیریت پروژه و بودجه</span>
              </span>
            )}
          </div>

          {expanded && (
            <button
              type="button"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#25C3C8]/25"
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
            className="mx-auto mt-3 grid h-8 w-8 place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#25C3C8]/25"
            onClick={toggleExpanded}
            aria-label="باز کردن منو"
          >
            <ChevronLeft className={svgCls} strokeWidth={2.2} />
          </button>
        )}

        <div className={["mt-5 min-h-0 flex-1 space-y-4", expanded ? "overflow-y-auto overflow-x-visible pr-0.5" : "overflow-visible"].join(" ")}>
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1.5">
              {expanded && (
                <div className="px-2 pb-1 text-right text-[11px] font-semibold text-neutral-400">
                  {group.title}
                </div>
              )}
              <div className={["space-y-1.5", expanded ? "" : "flex flex-col items-center"].join(" ")}>
                {group.items.map(renderDesktopItem)}
              </div>
            </div>
          ))}
        </div>

        <div className={["border-t border-neutral-100 pt-3", expanded ? "mt-3" : "mt-4"].join(" ")}>
          {expanded ? (
            <div className="flex items-center gap-2 rounded-xl border border-neutral-100 bg-neutral-50/80 p-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-sm font-bold text-[#0FA4AB] shadow-sm">
                {initials}
              </span>
              <span className="min-w-0 flex-1 text-right">
                <span className="block truncate text-xs font-bold text-neutral-900">{displayName}</span>
                <span className="block truncate text-[11px] leading-4 text-neutral-400">{displayRole}</span>
              </span>
              <button
                type="button"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-neutral-400 transition hover:bg-white hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#25C3C8]/25"
                onClick={logout || (() => {})}
                aria-label="خروج"
              >
                <LogOut className={svgCls} strokeWidth={2.1} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="mx-auto grid h-10 w-10 place-items-center rounded-full border border-neutral-100 bg-neutral-50 text-sm font-bold text-[#0FA4AB] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#25C3C8]/25"
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
        className="fixed inset-x-0 bottom-0 z-50 lg:hidden pointer-events-none px-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4"
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
                    className={[mobileSubItemCls, isActive(item.to) ? "!bg-[#EAFBFC] !text-[#0FA4AB]" : ""].join(" ")}
                  >
                    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-50 dark:bg-white/10">
                      {item.icon}
                    </span>
                    <span className="relative min-w-0">
                      <span className="block truncate text-sm font-bold leading-5 text-current sm:text-[15px]">
                        {item.label}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] leading-4 text-neutral-500 sm:text-xs">
                        {item.hint}
                      </span>
                    </span>
                  </LinkBtn>
                ))}
              </div>
            </div>
          )}

          <div className={mobileHeaderPanelCls}>
            <div className="relative z-[3] grid grid-cols-6 items-center gap-1.5 sm:gap-2">
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
                aria-label="اسناد و نامه ها"
              >
                <IcLetter />
                <span className="max-w-full truncate px-0.5 text-[9px] font-medium leading-none text-current sm:text-[11px]">
                  نامه ها
                </span>
              </LinkBtn>

              <Btn
                type="button"
                className={mobileDockBtn(projectsParentActive)}
                onClick={() => toggle("projects")}
                aria-label="پروژه ها"
              >
                {open.projects ? <IcClose /> : <IcProjects />}
                <span className="max-w-full truncate px-0.5 text-[9px] font-medium leading-none text-current sm:text-[11px]">
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
                <span className="max-w-full truncate px-0.5 text-[9px] font-medium leading-none text-current sm:text-[11px]">
                  پرداخت
                </span>
              </LinkBtn>

              <Btn
                type="button"
                className={mobileDockBtn(budgetParentActive)}
                onClick={() => toggle("budget")}
                aria-label="بودجه بندی"
              >
                {open.budget ? <IcClose /> : <IcBudget />}
                <span className="max-w-full truncate px-0.5 text-[9px] font-medium leading-none text-current sm:text-[11px]">
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
                <span className="max-w-full truncate px-0.5 text-[9px] font-medium leading-none text-current sm:text-[11px]">
                  پایه
                </span>
              </Btn>
            </div>
          </div>
        </div>
      </nav>

      {canHover && tip.show && (
        <div
          className="fixed z-[80] pointer-events-none rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-700 shadow-lg whitespace-nowrap"
          style={{ top: tip.y, right: "92px", transform: "translateY(-50%)" }}
        >
          {tip.label}
        </div>
      )}
    </>
  );
}

export default React.memo(RightNav);
