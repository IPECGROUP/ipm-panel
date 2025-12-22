import { useEffect, useMemo, useState, useCallback } from "react";

export function usePageAccess(pageKey, allTabs) {
  const API_BASE = useMemo(() => (window.API_URL || "/api").replace(/\/+$/, ""), []);
  const allTabIds = useMemo(() => (allTabs || []).map((t) => String(t.id)), [allTabs]);

  const [me, setMe] = useState(null);
  const [allowedTabs, setAllowedTabs] = useState(null);
  const [canAccessPage, setCanAccessPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  const allowedTabsSet = useMemo(() => new Set((allowedTabs || []).map(String)), [allowedTabs]);

  const refresh = useCallback(() => setRefreshTick((x) => x + 1), []);

  useEffect(() => {
    const onFocus = () => refresh();
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh]);

  useEffect(() => {
    let alive = true;
    const ac = typeof AbortController !== "undefined" ? new AbortController() : null;

    const api = async (path, opt = {}) => {
      const res = await fetch(API_BASE + path, {
        credentials: "include",
        signal: ac ? ac.signal : undefined,
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
        throw Object.assign(new Error(data?.error || data?.message || "request_failed"), { status: res.status });
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

        const rule = a?.pages?.[pageKey] ?? null;

        if (!rule || rule === null || rule?.permitted === 0 || rule?.permitted === false || rule?.permitted === "0") {
          setAllowedTabs([]);
          setCanAccessPage(false);
          setLoading(false);
          return;
        }

        // اگر این صفحه اصلاً تب ندارد
        if (!allTabIds.length) {
          setAllowedTabs([]);
          setCanAccessPage(true);
          setLoading(false);
          return;
        }

        // tabs=null => همه تب‌ها
        if (rule?.tabs === null) {
          setAllowedTabs(allTabIds);
          setCanAccessPage(true);
          setLoading(false);
          return;
        }

        // tabs=object => فقط همان‌ها
        if (rule?.tabs && typeof rule.tabs === "object") {
          const okTabs = allTabIds.filter((id) => {
            const v = rule.tabs[id];
            return v === 1 || v === true || v === "1";
          });
          setAllowedTabs(okTabs);
          setCanAccessPage(okTabs.length > 0);
          setLoading(false);
          return;
        }

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
      if (ac) ac.abort();
    };
  }, [API_BASE, pageKey, allTabIds, refreshTick]);

  return { me, allowedTabs, allowedTabsSet, canAccessPage, loading, refresh };
}
