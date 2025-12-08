// src/pages/RequestDetailPage.jsx
import React from "react";
import { useLocation } from "react-router-dom";

import Shell from "../components/layout/Shell.jsx";
import Card from "../components/ui/Card.jsx";
import Row from "../components/ui/Row.jsx";
import Tag from "../components/ui/Tag.jsx";
import { PrimaryBtn, DangerBtn } from "../components/ui/Button.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import { isMainAdminUser } from "../utils/auth.js";

function formatMoney(n) {
  if (n == null) return "0";
  const v = Number(n) || 0;
  return v.toLocaleString("fa-IR");
}

export default function RequestDetailPage() {
  const { user } = useAuth();
  const isMainAdmin = isMainAdminUser(user);

  const loc = useLocation();
  const id = React.useMemo(
    () => (loc.pathname.split("/").pop() || "").trim(),
    [loc.pathname]
  );

  const [data, setData] = React.useState(null);
  const [status, setStatus] = React.useState("pending");

  React.useEffect(() => {
    // ✅ فقط داده نمونه؛ هیچ درخواست واقعی به /api نمی‌زنیم
    const mock = {
      request: {
        id,
        type: "projects",
        type_label: "بودجه پروژه‌ها",
        project_name: "پروژه نمونه A",
        sub_budget: "A-01",
        period_label: "فروردین ۱۴۰۴",
        estimated_total: 250000000,
        status: "pending",
      },
      cost_center_texts: ["دفتر مرکزی", "کنترل پروژه"],
      created_by: { username: "ali", email: "ali@example.com" },
    };

    setData(mock);
    setStatus(mock.request.status);
  }, [id]);

  if (!data) {
    return (
      <Shell>
        <Card className="p-5 md:p-6 rounded-2xl border bg-white text-neutral-900 border-black/10 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
          در حال بارگذاری...
        </Card>
      </Shell>
    );
  }

  const { request, cost_center_texts, created_by } = data;

  const handleStatusChange = (nextStatus) => {
    if (nextStatus === "rejected") {
      const reason = window.prompt("دلیل رد:");
      // فقط لاگ فرانت؛ بعداً تو نسخه Next.js می‌فرستیم سرور
      console.log("Reject reason:", reason);
    }
    setStatus(nextStatus);
  };

  const statusLabel = (() => {
    if (status === "approved") return "تایید شده";
    if (status === "rejected") return "رد شده";
    return "در انتظار بررسی";
  })();

  return (
    <Shell>
      <Card className="p-5 md:p-6 rounded-2xl border bg-white text-neutral-900 border-black/10 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
        {/* هدر */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
            جزئیات درخواست
          </h1>
          <div className="shrink-0">
            <Tag color={status}>{statusLabel}</Tag>
          </div>
        </div>

        <div className="h-px bg-black/10 dark:bg-white/10 mb-4" />

        {/* اطلاعات کلی */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4">
          <Row label="نوع بودجه">
            {request.type_label || request.type || "—"}
          </Row>
          <Row label="اسم پروژه">
            {request.project_name || "—"}
          </Row>
          <Row label="زیر بودجه">
            {request.sub_budget || "—"}
          </Row>
          <Row label="مراکز هزینه">
            {(cost_center_texts && cost_center_texts.length > 0
              ? cost_center_texts.join("، ")
              : "—")}
          </Row>
          <Row label="دوره">
            {request.period_label || "—"}
          </Row>
          <Row label="برآورد هزینه‌ها">
            {formatMoney(request.estimated_total)} <span>ریال</span>
          </Row>
          <Row label="ثبت‌کننده">
            {created_by?.username || created_by?.email || "—"}
          </Row>
        </section>

        <div className="h-px bg-black/10 dark:bg-white/10 mb-4" />

        {/* دکمه‌های اقدام (فعلاً فقط فرانت) */}
        {isMainAdmin && (
          <div className="flex flex-wrap items-center gap-2 justify-end">
            {status !== "approved" && (
              <PrimaryBtn
                type="button"
                onClick={() => handleStatusChange("approved")}
                className="h-10 px-4 rounded-xl"
              >
                تایید
              </PrimaryBtn>
            )}

            {status !== "rejected" && (
              <DangerBtn
                type="button"
                onClick={() => handleStatusChange("rejected")}
                className="h-10 px-4 rounded-xl
                           !bg-white !text-red-600 !ring-1 !ring-red-500/70
                           hover:!bg-black/5
                           dark:!bg-transparent dark:!text-red-300 dark:hover:!bg-white/10"
              >
                رد
              </DangerBtn>
            )}
          </div>
        )}
      </Card>
    </Shell>
  );
}
