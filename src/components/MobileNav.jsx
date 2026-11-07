import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Glass } from "glisse";
import { ChevronLeft, LogOut, MoreHorizontal, Search, X } from "lucide-react";
import "./MobileNav.css";

const normalize = (value) => value.replace(/[ي]/g, "ی").replace(/ك/g, "ک").replace(/‌/g, " ").trim();

export default function MobileNav({ groups, user, logout, isActive }) {
  const dialog = useRef(null);
  const [panel, setPanel] = useState(null);
  const [query, setQuery] = useState("");
  const [sheetHeight, setSheetHeight] = useState(60);
  const drag = useRef(null);
  const updateHeight = (clientY) => {
    const viewportHeight = window.innerHeight;
    setSheetHeight(Math.min(90, Math.max(35, ((viewportHeight - clientY) / viewportHeight) * 100)));
  };
  const startResize = (event) => {
    if (event.button !== 0) return;
    drag.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateHeight(event.clientY);
  };
  const moveResize = (event) => {
    if (drag.current === event.pointerId) updateHeight(event.clientY);
  };
  const endResize = (event) => {
    if (drag.current === event.pointerId) drag.current = null;
  };
  const items = groups.flatMap((group) => group.items);
  const destinations = items.flatMap((item) => item.type === "section" ? item.items : [item]);
  const unique = destinations.filter((item, index) => destinations.findIndex((other) => other.to === item.to) === index);
  const section = items.find((item) => item.key === panel);
  const primary = [items.find((item) => item.to === "/"), items.find((item) => item.to === "/letters"), items.find((item) => item.key === "contracts"), items.find((item) => item.key === "projects")].filter(Boolean);
  const moreActive = !primary.some((item) => item.type === "section" ? item.items.some((child) => isActive(child.to)) : item.active);

  useEffect(() => {
    if (!panel) { dialog.current?.close(); return; }
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) setPanel(null); };
    desktop.addEventListener("change", closeOnDesktop);
    closeOnDesktop();
    return () => { document.body.style.overflow = previous; desktop.removeEventListener("change", closeOnDesktop); };
  }, [panel]);

  const close = () => { setPanel(null); setQuery(""); };
  const open = (key) => { setQuery(""); setPanel(key); };
  const link = (item, className = "mobile-menu-link") => (
    <Link key={item.to} to={item.to} onClick={close} className={className} aria-current={isActive(item.to) ? "page" : undefined}>
      <span className="mobile-menu-icon">{item.icon}</span>
      <span>{item.label}</span>
      {className === "mobile-menu-link" && <ChevronLeft size={16} />}
    </Link>
  );

  return (
    <div className="ipm-mobile-nav" dir="rtl">
      <Glass role="navigation" className="mobile-dock" aria-label="منوی اصلی موبایل" style={{ "--dock-count": primary.length + 1 }}>
        {primary.map((item) => item.type === "section" ? (
          <button key={item.key} type="button" aria-label={item.label} aria-haspopup="dialog" aria-expanded={panel === item.key} className={item.items.some((child) => isActive(child.to)) ? "is-active" : ""} onClick={() => open(item.key)}>
            {item.icon}<span>{item.key === "contracts" ? "قراردادها" : "پروژه‌ها"}</span>
          </button>
        ) : <Link key={item.to} to={item.to} aria-current={item.active ? "page" : undefined} onClick={close}>{item.icon}<span>{item.label}</span></Link>)}
        <button type="button" className={panel === "more" || moreActive ? "is-active" : ""} aria-haspopup="dialog" aria-expanded={panel === "more"} onClick={() => open("more")}><MoreHorizontal size={25} /><span>بیشتر</span></button>
      </Glass>

      <dialog ref={dialog} className="mobile-menu-dialog" style={{ "--sheet-height": `${sheetHeight}dvh` }} aria-label={section?.label || "منوی بخش‌ها"} onCancel={close} onClose={close} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
        <div className="mobile-menu-sheet">
          <div className="mobile-sheet-resize" role="slider" tabIndex={0}
            aria-label="تغییر ارتفاع منو" aria-orientation="vertical" aria-valuemin={35} aria-valuemax={90} aria-valuenow={Math.round(sheetHeight)} aria-valuetext={`${Math.round(sheetHeight)}%`}
            onPointerDown={startResize} onPointerMove={moveResize} onPointerUp={endResize} onPointerCancel={endResize} onLostPointerCapture={endResize}
            onKeyDown={(event) => { if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); setSheetHeight((height) => Math.min(90, Math.max(35, height + (event.key === "ArrowUp" ? 5 : -5)))); } }}>
            <span className="mobile-sheet-handle" />
          </div>
          <header className="mobile-menu-heading">
            <div>{section && <h2>{section.label}</h2>}</div>
            <button type="button" className="mobile-round-button" onClick={close} aria-label="بستن منو" autoFocus><X size={20} /></button>
          </header>
          <div className="mobile-menu-scroll">
            {panel === "more" && <>
              <label className="mobile-menu-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جستجو در بخش‌ها…" aria-label="جستجو در بخش‌ها" />{query && <button type="button" onClick={() => setQuery("")} aria-label="پاک کردن جستجو"><X size={16} /></button>}</label>
              {query ? <div className="mobile-menu-results">
                {unique.filter((item) => normalize(item.label).includes(normalize(query))).map((item) => link(item))}
                {!unique.some((item) => normalize(item.label).includes(normalize(query))) && <p className="mobile-menu-empty">بخشی با این نام پیدا نشد.</p>}
              </div> : <><h3 className="mobile-sections-title">سایر بخش‌ها</h3><div className="mobile-section-list">{items.map((item) => item.type === "section" ? <button key={item.key} type="button" className="mobile-menu-link" onClick={() => open(item.key)}><span className="mobile-menu-icon">{item.icon}</span><span>{item.label}</span><ChevronLeft size={16} /></button> : link(item))}</div></>}
            </>}
            {section && <><button type="button" className="mobile-back-button" onClick={() => open("more")}>همه بخش‌ها <ChevronLeft size={16} /></button><div className="mobile-section-list">{section.items.map((item) => link(item))}</div></>}
            <footer className="mobile-menu-profile"><span className="mobile-avatar">{String(user?.name || user?.username || "ک").slice(0, 1)}</span><span>{user?.name || user?.username || "کاربر سامانه"}<small>سامانه مدیریت یکپارچه</small></span><button type="button" aria-label="خروج از حساب" onClick={() => { close(); logout?.(); }}><LogOut size={19} /></button></footer>
          </div>
        </div>
      </dialog>
    </div>
  );
}
