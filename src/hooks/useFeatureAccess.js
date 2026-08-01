import { useEffect, useMemo } from "react";
import { useAuth } from "../components/AuthProvider.jsx";

const PAGE_INDEX = {
  "مدیریت اسناد": 1,
  "قراردادها": 2,
  "روزنگار پروژه": 4,
  "ساختار شکست هزینه‌ها": 5,
  "تعهدات و مصارف مالی": 6,
  "کاربرگ مالی": 7,
  "درخواست پرداخت": 9,
  "تخصیص نقدینگی": 10,
  "پیش‌بینی جریان نقدی": 11,
  "درخواست تأمین": 13,
};

export function useFeatureAccess(page) {
  const { user } = useAuth();

  return useMemo(() => {
    const isAdmin = String(user?.role || "").toLowerCase() === "admin";
    const pageIndex = PAGE_INDEX[page];
    const access = new Set(Array.isArray(user?.access) ? user.access.map(String) : []);
    const can = (feature) =>
      isAdmin ||
      access.has(`page-access:${pageIndex}:همه`) ||
      access.has(`page-access:${pageIndex}:${feature}`);

    return { can, canOpen: can("نمایش منو"), isAdmin };
  }, [page, user]);
}

export function useFeatureVisibility(page, featureLabels) {
  const { can } = useFeatureAccess(page);
  useEffect(() => {
    const hidden = new Map();
    const apply = () => Object.entries(featureLabels || {}).forEach(([feature, labels]) => {
      if (can(feature)) return;
      const terms = Array.isArray(labels) ? labels : [labels];
      document.querySelectorAll("button, [role='button']").forEach((element) => {
        const text = `${element.textContent || ""} ${element.title || ""} ${element.getAttribute("aria-label") || ""}`;
        if (!terms.some((term) => text.includes(term))) return;
        if (!hidden.has(element)) hidden.set(element, element.style.display);
        element.style.display = "none";
      });
    });
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); hidden.forEach((value, element) => { element.style.display = value; }); };
  }, [can, featureLabels]);
}
