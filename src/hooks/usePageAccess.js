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
      try { data = txt ? JSON.parse(txt) : {}; } catch { data = {}; }
      if (!res.ok) throw Object.assign(new Error(data?.error || data?.message || "request_failed"), { status: res.status });
      return data;
    };

    (async () => {
      setLoading(true);
      try {
        const m = await api("/auth/me");
        if (!alive) return;
        const user = m?.user || m || null;
        setMe(user);

        // admin => همه تب‌ها
        if (String(user?.role || "").toLowerCase() === "admin") {
          setAllowedTabs(allTabIds);
          setCanAccessPage(true);
          setLoading(false);
          return;
        }

        const a = await api("/access/my");
        if (!alive) return;

        const rule = a?.pages?.[pageKey] ?? null;

        // ✅ null یعنی اصلاً دسترسی ندارد
        if (rule === null) {
          setAllowedTabs([]);
          setCanAccessPage(false);
          setLoading(false);
          return;
        }

        // اگر tabs=null => همه تب‌ها
        if (rule?.tabs === null) {
          setAllowedTabs(allTabIds);
          setCanAccessPage(true);
          setLoading(false);
          return;
        }

        // اگر tabs آبجکت است => فقط همان‌ها
        if (rule?.tabs && typeof rule.tabs === "object") {
          const okTabs = allTabIds.filter((id) => rule.tabs[id] === 1 || rule.tabs[id] === true || rule.tabs[id] === "1");
          setAllowedTabs(okTabs);
          setCanAccessPage(okTabs.length > 0);
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

    return () => { alive = false; };
  }, [API_BASE, pageKey, allTabIds]);

  return { me, allowedTabs, canAccessPage, loading };
}
