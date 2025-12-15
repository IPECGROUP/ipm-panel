import { useEffect, useMemo, useState } from "react";
import { api } from "../utils/api";

const truthy = (v) => v === true || v === 1 || v === "1" || v === "true";

const pickArrayAny = (r) => {
  if (!r) return [];
  if (Array.isArray(r)) return r;
  if (Array.isArray(r.items)) return r.items;
  if (Array.isArray(r.rules)) return r.rules;
  if (Array.isArray(r.unitAccessRules)) return r.unitAccessRules;
  if (Array.isArray(r.unit_access_rules)) return r.unit_access_rules;
  if (r.data && Array.isArray(r.data.items)) return r.data.items;
  return [];
};

const normalizeAccessLabels = (me) => {
  if (!me) return [];
  if (Array.isArray(me.access_labels)) return me.access_labels.map(String);
  if (Array.isArray(me.access)) return me.access.map(String);
  if (typeof me.access_labels === "string") {
    try {
      const j = JSON.parse(me.access_labels);
      if (Array.isArray(j)) return j.map(String);
    } catch {}
    return [String(me.access_labels)];
  }
  if (typeof me.access === "string") {
    try {
      const j = JSON.parse(me.access);
      if (Array.isArray(j)) return j.map(String);
    } catch {}
    return [String(me.access)];
  }
  return [];
};

export function usePageAccess(pageKey, tabs = []) {
  const allTabIds = useMemo(() => tabs.map((t) => t.id), [tabs]);

  const [me, setMe] = useState(null);
  const [rules, setRules] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1) گرفتن me
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api("/auth/me");
        if (!alive) return;
        setMe(r?.user || null);
      } catch {
        if (!alive) return;
        setMe(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 2) گرفتن rules
  useEffect(() => {
    if (!me) {
      setRules([]);
      setLoading(false);
      return;
    }

    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const r = await api("/access/my");
        if (!alive) return;
        const arr = pickArrayAny(r);
        const arr2 = arr.length ? arr : pickArrayAny(r?.access || r?.data || r?.result);
        setRules(arr2 || []);
      } catch {
        if (!alive) return;
        setRules([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [me]);

  const isAllAccess = useMemo(() => {
    if (!me) return false;
    if (String(me.role || "").toLowerCase() === "admin") return true;
    const labels = normalizeAccessLabels(me);
    return labels.includes("all");
  }, [me]);

  const allowedTabs = useMemo(() => {
    if (!me) return [];
    if (isAllAccess) return allTabIds;

    const pageRules = (rules || []).filter((x) => String(x.page || "").trim() === String(pageKey || "").trim());
    if (!pageRules.length) return allTabIds; // پیش‌فرض: قفل نکن

    const allowAllTabs = pageRules.some(
      (x) => (x.tab === null || x.tab === undefined || x.tab === "") && truthy(x.permitted)
    );
    if (allowAllTabs) return allTabIds;

    const tabsAllowed = pageRules
      .filter((x) => truthy(x.permitted) && x.tab != null && String(x.tab).trim())
      .map((x) => String(x.tab).trim());

    return tabsAllowed.length ? tabsAllowed.filter((t) => allTabIds.includes(t)) : [];
  }, [me, isAllAccess, rules, allTabIds, pageKey]);

  const canAccessPage = useMemo(() => {
    if (!me) return false;
    if (isAllAccess) return true;
    // اگر صفحه تب دارد => داشتن حداقل یک تب کافی است
    if (allTabIds.length) return allowedTabs.length > 0;
    // اگر تب ندارد => وجود rule با tab=null و permitted true
    const pageRules = (rules || []).filter((x) => String(x.page || "").trim() === String(pageKey || "").trim());
    return pageRules.some((x) => (x.tab === null || x.tab === undefined || x.tab === "") && truthy(x.permitted));
  }, [me, isAllAccess, allowedTabs, allTabIds.length, rules, pageKey]);

  return { me, loading, isAllAccess, canAccessPage, allowedTabs };
}
