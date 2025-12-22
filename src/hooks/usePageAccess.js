// src/hooks/usePageAccess.js
import { useEffect, useMemo, useState } from "react";

export function usePageAccess(pageKey, allTabs) {
  const API_BASE = useMemo(() => (window.API_URL || "/api").replace(/\/+$/, ""), []);
  const allTabIds = useMemo(() => (allTabs || []).map((t) => String(t.id)), [allTabs]);

  const [me, setMe] = useState(null);
  const [allowedTabs, setAllowedTabs] = useState(null);
  const [canAccessPage, setCanAccessPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const api = async (path, opt = {}) => {
      const res = await fetch(API_BASE + path, {
        credentials: "include",
        ...opt,
        headers: { "Content-Type": "application/json", ...(opt.headers || {}) },
      });
      const txt = await res.text();
      let data = {};
      try {
        data = txt ? JSON.parse(txt) : {};
      } catch {
        data = {};
      }
      if (!res.ok) {
        throw Object.assign(new Error(data?.error || data?.message || "request_failed"), {
          status: res.status,
        });
      }
      return data;
    };

    (async () => {
      setLoading(true);
      try {
        const m = await api("/auth/me");
        if (!alive) return;

        const user = m?.user || m || null;
        setMe(user);

        if (String(user?.role || "").toLowerCase() === "admin") {
          setAllowedTabs(allTabIds);
          setCanAccessPage(true);
          setLoading(false);
          return;
        }

        const a = await api("/access/my");
        if (!alive) return;

        const pages = a?.pages || {};

        // ✅ اگر کلید صفحه اصلاً وجود ندارد => یعنی هیچ دسترسی‌ای برای این صفحه ثبت نشده
        if (!Object.prototype.hasOwnProperty.call(pages, pageKey)) {
          setAllowedTabs([]);
          setCanAccessPage(false);
          setLoading(false);
          return;
        }

        const rule = pages[pageKey]; // می‌تواند null یا object یا array باشد

        // ✅ null یعنی دسترسی کامل صفحه (همه تب‌ها)
        if (rule === null) {
          setAllowedTabs(allTabIds);
          setCanAccessPage(allTabIds.length > 0);
          setLoading(false);
          return;
        }

        // اگر آرایه بود => همان‌ها
        if (Array.isArray(rule)) {
          const okTabs = allTabIds.filter((id) => rule.includes(id));
          setAllowedTabs(okTabs);
          setCanAccessPage(okTabs.length > 0);
          setLoading(false);
          return;
        }

        // اگر آبجکت بود => شکل جدید: { permitted, tabs }
        if (rule && typeof rule === "object") {
          const permitted =
            rule.permitted === undefined
              ? true
              : rule.permitted === 1 || rule.permitted === true || rule.permitted === "1" || rule.permitted === "true";

          if (!permitted) {
            setAllowedTabs([]);
            setCanAccessPage(false);
            setLoading(false);
            return;
          }

          // tabs === null => همه تب‌ها
          if (rule.tabs === null || rule.tabs === undefined) {
            setAllowedTabs(allTabIds);
            setCanAccessPage(allTabIds.length > 0);
            setLoading(false);
            return;
          }

          // tabs آبجکت => فقط همان‌ها
          if (rule.tabs && typeof rule.tabs === "object") {
            const okTabs = allTabIds.filter((id) => {
              const v = rule.tabs[id];
              return v === 1 || v === true || v === "1" || v === "true";
            });

            // اگر permitted هست ولی tabs خالیه، منطقی‌ترین حالت: همه تب‌ها
            const finalTabs = okTabs.length ? okTabs : allTabIds;

            setAllowedTabs(finalTabs);
            setCanAccessPage(finalTabs.length > 0);
            setLoading(false);
            return;
          }

          // اگر tabs چیز دیگری بود => امن: همه تب‌ها (چون permitted داریم)
          setAllowedTabs(allTabIds);
          setCanAccessPage(allTabIds.length > 0);
          setLoading(false);
          return;
        }

        // fallback ایمن => بدون دسترسی
        setAllowedTabs([]);
        setCanAccessPage(false);
        setLoading(false);
      } catch {
        if (!alive) return;
        setMe(null);
        setAllowedTabs([]);
        setCanAccessPage(false);
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [API_BASE, pageKey, allTabIds]);

  return { me, allowedTabs, canAccessPage, loading };
}
