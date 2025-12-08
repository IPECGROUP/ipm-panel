import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Tag from "../ui/Tag.jsx"; // اگر مسیرش فرق داره، فقط این رو مطابق پروژه‌ات اصلاح کن

function RequestsTable() {
  const nav = useNavigate();

  const [rows] = useState([
    {
      id: 101,
      status: "pending",
      type: "projects",
      type_label: "پروژه‌ها",
      project_name: "پروژه نمونه A",
      sub_budget: "A-01",
      cost_center_texts: ["OB-001", "SB-002"],
      period_start: "2025-01-01",
      period_end: "2025-01-31",
      created_by_username: "علی مدیری",
      created_by_email: "ali@example.com",
    },
    {
      id: 102,
      status: "approved",
      type: "office",
      type_label: "دفتر مرکزی",
      project_name: "هزینه‌های اداری",
      sub_budget: "O-10",
      cost_center_texts: ["OB-010"],
      period_start: "2025-02-01",
      period_end: "2025-02-28",
      created_by_username: "کارشناس حسابداری",
      created_by_email: "acc@example.com",
    },
  ]);

  const ccTexts = (row) => {
    if (Array.isArray(row.cost_center_texts) && row.cost_center_texts.length) {
      return row.cost_center_texts.join("، ");
    }
    return row.cost_center_texts || "—";
  };

  return (
    <div className="overflow-auto rounded-2xl border bg-white text-neutral-900 border-black/10 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
      <table
        className="w-full text-sm 
                   [&_th]:text-center [&_td]:text-center"
        dir="rtl"
      >
        <thead>
          <tr className="bg-black/5 text-neutral-900 border-y border-black/10 dark:bg-white/5 dark:text-neutral-100 dark:border-neutral-700">
            <th className="p-3">وضعیت</th>
            <th className="p-3">نوع بودجه</th>
            <th className="p-3">اسم پروژه</th>
            <th className="p-3">زیر بودجه</th>
            <th className="p-3">مراکز هزینه</th>
            <th className="p-3">دوره</th>
            <th className="p-3">ثبت‌کننده</th>
            <th className="p-3 w-32">اقدام</th>
          </tr>
        </thead>

        <tbody
          className="divide-y divide-black/5 dark:divide-neutral-800
                     [&>tr:nth-child(odd)]:bg-black/[0.02]
                     [&>tr:nth-child(even)]:bg-black/[0.04]
                     [&>tr:hover]:bg-black/[0.06]
                     dark:[&>tr:nth-child(odd)]:bg-white/5
                     dark:[&>tr:nth-child(even)]:bg-white/10
                     dark:[&>tr:hover]:bg-white/15"
        >
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                className="p-4 text-center text-neutral-500 dark:text-neutral-400 bg-transparent"
              >
                درخواستی نیست.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <td className="px-3 py-3">
                  <Tag color={row.status}>{row.status}</Tag>
                </td>
                <td className="px-3 py-3">
                  {row.type_label || row.type || "—"}
                </td>
                <td className="px-3 py-3">
                  {row.project_name || "—"}
                </td>
                <td className="px-3 py-3">
                  {row.sub_budget || "—"}
                </td>
                <td className="px-3 py-3">{ccTexts(row)}</td>
                <td className="px-3 py-3 whitespace-nowrap">
                  {jdate(row.period_start)} تا {jdate(row.period_end)}
                </td>
                <td className="px-3 py-3">
                  {row.created_by_username || row.created_by_email || "—"}
                </td>
                <td className="px-3 py-3">
                  <button
                    className="h-9 px-4 rounded-xl text-xs font-medium
                               bg-white text-neutral-900 ring-1 ring-black/15
                               hover:bg-black/5 transition
                               dark:bg-neutral-900 dark:text-neutral-100 dark:ring-neutral-700 dark:hover:bg-white/10"
                    onClick={() => nav(`/req/${row.id}`)}
                  >
                    باز کردن
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default RequestsTable;
