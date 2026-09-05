import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronLeft, LogOut, MoreHorizontal, Pencil, Plus, Search, X } from "lucide-react";
import "./MobileNav.css";

const defaults = ["/contracts/info", "/centers/projects", "/letters", "/finance/payment-request", "/knowledge-management/project-lessons-learned"];
const normalize = (value) => value.replace(/[ي]/g, "ی").replace(/ك/g, "ک").replace(/‌/g, " ").trim();

export default function MobileNav({ groups, user, logout, isActive }) {
  const dialog = useRef(null);
  const [panel, setPanel] = useState(null);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const storageKey = `ipm-mobile-shortcuts:${user?.id || user?.username || "guest"}`;
  const [saved, setSaved] = useState(() => {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey));
      if (Array.isArray(value)) return [...new Set(value.filter((to) => typeof to === "string"))].slice(0, 6);
    } catch { /* Use defaults if storage is unavailable. */ }
    return defaults;
  });
  const items = groups.flatMap((group) => group.items);
  const destinations = items.flatMap((item) => item.type === "section" ? item.items : [item]);
  const unique = destinations.filter((item, index) => destinations.findIndex((other) => other.to === item.to) === index);
  const shortcuts = saved.map((to) => unique.find((item) => item.to === to)).filter(Boolean);
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

  const close = () => { setPanel(null); setEditing(false); setQuery(""); };
  const open = (key) => { setEditing(false); setQuery(""); setPanel(key); };
  const toggleShortcut = (to) => {
    const next = saved.includes(to) ? saved.filter((value) => value !== to) : [...saved.filter((value) => unique.some((item) => item.to === value)), to].slice(0, 6);
    setSaved(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Keep session edits. */ }
  };
  const link = (item, className = "mobile-menu-link") => (
    <Link key={item.to} to={item.to} onClick={close} className={className} aria-current={isActive(item.to) ? "page" : undefined}>
      <span className="mobile-menu-icon">{item.icon}</span>
      <span>{item.label}</span>
      {className === "mobile-menu-link" && <ChevronLeft size={16} />}
    </Link>
  );

  return (
    <div className="ipm-mobile-nav" dir="rtl">
      <nav className="mobile-dock" aria-label="منوی اصلی موبایل" style={{ "--dock-count": primary.length + 1 }}>
        {primary.map((item) => item.type === "section" ? (
          <button key={item.key} type="button" aria-label={item.label} aria-haspopup="dialog" aria-expanded={panel === item.key} className={item.items.some((child) => isActive(child.to)) ? "is-active" : ""} onClick={() => open(item.key)}>
            {item.icon}<span>{item.key === "contracts" ? "قراردادها" : "پروژه‌ها"}</span>
          </button>
        ) : <Link key={item.to} to={item.to} aria-current={item.active ? "page" : undefined} onClick={close}>{item.icon}<span>{item.to === "/letters" ? "اسناد" : item.label}</span></Link>)}
        <button type="button" className={panel === "more" || moreActive ? "is-active" : ""} aria-haspopup="dialog" aria-expanded={panel === "more"} onClick={() => open("more")}><MoreHorizontal size={25} /><span>بیشتر</span></button>
      </nav>

      <dialog ref={dialog} className="mobile-menu-dialog" aria-labelledby="mobile-menu-title" onCancel={close} onClose={close} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
        <div className="mobile-menu-sheet">
          <div className="mobile-sheet-handle" aria-hidden="true" />
          <header className="mobile-menu-heading">
            <div><span className="mobile-menu-eyebrow">دسترسی سریع</span><h2 id="mobile-menu-title">{section?.label || "میانبرهای من"}</h2>{section && <p>بخش مورد نظر خود را انتخاب کنید.</p>}</div>
            <button type="button" className="mobile-round-button" onClick={close} aria-label="بستن منو" autoFocus><X size={20} /></button>
          </header>
          <div className="mobile-menu-scroll">
            {panel === "more" && <>
              <div className="mobile-shortcut-heading"><span aria-hidden="true" /><button type="button" onClick={() => { setEditing(!editing); setQuery(""); }}>{editing ? <Check size={15} /> : <Pencil size={15} />}{editing ? "انجام شد" : "ویرایش"}</button></div>
              {!editing && <div className="mobile-shortcuts">{shortcuts.map((item) => link(item, "mobile-shortcut"))}{shortcuts.length < 6 && <button type="button" className="mobile-shortcut mobile-shortcut-add" onClick={() => setEditing(true)}><Plus size={25} /><span>افزودن میانبر</span></button>}</div>}
              {editing && <p className="mobile-edit-hint">تا ۶ میانبر انتخاب کنید. برای حذف، دوباره روی گزینه بزنید.</p>}
              <label className="mobile-menu-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جستجو در بخش‌ها…" aria-label="جستجو در بخش‌ها" />{query && <button type="button" onClick={() => setQuery("")} aria-label="پاک کردن جستجو"><X size={16} /></button>}</label>
              {editing || query ? <div className="mobile-menu-results">
                {unique.filter((item) => normalize(item.label).includes(normalize(query))).map((item) => editing ? <button key={item.to} type="button" className="mobile-menu-link" aria-pressed={saved.includes(item.to)} disabled={!saved.includes(item.to) && shortcuts.length >= 6} onClick={() => toggleShortcut(item.to)}><span className="mobile-menu-icon">{item.icon}</span><span>{item.label}</span>{saved.includes(item.to) ? <Check size={18} /> : <Plus size={18} />}</button> : link(item))}
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
