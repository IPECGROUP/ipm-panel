// src/pages/ContractInfoPage.jsx
import React, { useState, useMemo } from "react";
import Shell from "../components/layout/Shell.jsx";
import Card from "../components/ui/Card.jsx";
import { TableWrap, THead, TH, TR, TD } from "../components/ui/Table.jsx";

export default function ContractInfoPage() {
  // فقط دیتا‌ی نمونه، هیچ تماس PHP /api نیست
  const [projects] = useState([
    { id: 1, code: "PRJ-001", name: "پروژه نمونه A" },
    { id: 2, code: "PRJ-002", name: "پروژه نمونه B" },
  ]);

  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const selectedProject = useMemo(
    () => (projects || []).find((p) => String(p.id) === String(projectId)),
    [projects, projectId]
  );

  // money helpers
  const formatMoney = (n) => {
    if (n === null || n === undefined) return "";
    const sign = n < 0 ? "-" : "";
    const s = String(Math.abs(Number(n) || 0));
    return sign + s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const parseMoney = (s) => {
    if (s == null) return 0;
    const sign = /^\s*-/.test(String(s)) ? -1 : 1;
    const d = String(s).replace(/[^\d]/g, "");
    if (!d) return 0;
    return sign * parseInt(d, 10);
  };

  // ==== تضامین قرارداد ====
  const guaranteeTitles = [
    { id: "performance", label: "انجام تعهدات" },
    { id: "dots", label: "…" },
    { id: "other", label: "سایر" },
  ];
  const [gTitle, setGTitle] = useState("performance");
  const [gTitleOther, setGTitleOther] = useState("");

  const guaranteeTypes = [
    { id: "check", label: "چک" },
    { id: "safte", label: "سفته" },
    { id: "bank", label: "ضمانت‌نامه بانکی" },
  ];
  const [gType, setGType] = useState("check");
  const [gText, setGText] = useState("");
  const [gAmount, setGAmount] = useState("");

  const [items, setItems] = useState([]); // {id, title, titleText, type, typeText, amount}
  const [editId, setEditId] = useState(null);
  const [viewItem, setViewItem] = useState(null);

  const onAddOrUpdate = () => {
    const amt = parseMoney(gAmount);
    const titleText =
      gTitle === "other"
        ? gTitleOther || "سایر"
        : guaranteeTitles.find((t) => t.id === gTitle)?.label || "";
    const typeText = guaranteeTypes.find((t) => t.id === gType)?.label || "";
    const row = {
      id: editId || Date.now() + Math.random(),
      title: gTitle,
      titleText,
      type: gType,
      typeText,
      extra: gText,
      amount: amt,
    };
    setItems((prev) => {
      if (editId) {
        return prev.map((it) => (it.id === editId ? row : it));
      }
      return [...prev, row];
    });
    setEditId(null);
    setGType("check");
    setGText("");
    setGAmount("");
    setGTitle("performance");
    setGTitleOther("");
  };

  const onEdit = (id) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    setEditId(it.id);
    setGType(it.type);
    setGText(it.extra || "");
    setGAmount(formatMoney(it.amount || 0));
    if (it.title === "other" || it.titleText === "سایر") {
      setGTitle("other");
      setGTitleOther(it.titleText === "سایر" ? "" : it.titleText);
    } else {
      const found = guaranteeTitles.find((t) => t.label === it.titleText);
      setGTitle(found ? found.id : "performance");
      setGTitleOther("");
    }
  };

  const onDelete = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    if (editId === id) {
      setEditId(null);
      setGType("check");
      setGText("");
      setGAmount("");
      setGTitle("performance");
      setGTitleOther("");
    }
  };

  return (
    <>
      <Card className="rounded-2xl border bg-white text-neutral-900 border-black/10 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
        {/* Breadcrumb */}
        <div className="mb-4 text-base md:text-lg">
          <span className="text-neutral-700 dark:text-neutral-300">پروژه‌ها</span>
          <span className="mx-2 text-neutral-500 dark:text-neutral-400">›</span>
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
            اطلاعات قراردادی
          </span>
        </div>

        {/* انتخاب پروژه + عنوان اتوماتیک */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-neutral-700 dark:text-neutral-300">
              کد پروژه
            </label>
            <select
              className="w-full rounded-xl px-3 py-2 ltr font-[inherit]
                         bg-white text-neutral-900 border border-black/10 outline-none
                         dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option className="bg-white dark:bg-neutral-900" value="">
                انتخاب کنید
              </option>
              {(projects || []).map((p) => (
                <option
                  className="bg-white dark:bg-neutral-900"
                  key={p.id}
                  value={p.id}
                >
                  {(p.code ? p.code : "—") + " — " + (p.name || "")}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-neutral-700 dark:text-neutral-300">
              عنوان قرارداد (اتوماتیک)
            </label>
            <div
              className="px-3 py-2 rounded-xl
                            bg-white text-neutral-900 ring-1 ring-black/10
                            dark:bg-neutral-900 dark:text-neutral-100 dark:ring-neutral-800"
            >
              {selectedProject?.name || "—"}
            </div>
          </div>
        </div>

        {/* ====== تضامین قرارداد ====== */}
        <div className="mt-2 mb-3 text-base font-bold text-neutral-900 dark:text-neutral-100">
          تضامین قرارداد
        </div>

        {/* عنوان تضمین */}
        <div className="mb-4">
          <div className="text-sm text-neutral-700 dark:text-neutral-300 mb-2">
            عنوان تضمین
          </div>
          <div className="flex flex-wrap gap-2">
            {guaranteeTitles.map((t) => (
              <label
                key={t.id}
                className={`px-3 py-2 rounded-xl cursor-pointer select-none text-sm transition
                ${
                  gTitle === t.id
                    ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                    : "bg-black/5 text-neutral-900 ring-1 ring-black/10 hover:bg-black/10 dark:bg-neutral-900 dark:text-neutral-100 dark:ring-neutral-800 dark:hover:bg-neutral-800"
                }`}
                onClick={() => setGTitle(t.id)}
              >
                {t.label}
              </label>
            ))}
            {gTitle === "other" && (
              <input
                className="rounded-xl px-3 py-2 text-sm
                           bg-white text-neutral-900 border border-black/10 outline-none placeholder:text-neutral-400
                           dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                value={gTitleOther}
                onChange={(e) => setGTitleOther(e.target.value)}
                placeholder="عنوان دلخواه…"
              />
            )}
          </div>
        </div>

        {/* نوع تضمین + فیلدها */}
        <div className="mb-3">
          <div className="text-sm text-neutral-700 dark:text-neutral-300 mb-2">
            نوع تضمین
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {guaranteeTypes.map((t) => (
              <label
                key={t.id}
                className={`px-3 py-2 rounded-xl cursor-pointer select-none text-sm transition
                ${
                  gType === t.id
                    ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                    : "bg-black/5 text-neutral-900 ring-1 ring-black/10 hover:bg-black/10 dark:bg-neutral-900 dark:text-neutral-100 dark:ring-neutral-800 dark:hover:bg-neutral-800"
                }`}
                onClick={() => setGType(t.id)}
              >
                {t.label}
              </label>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-neutral-700 dark:text-neutral-300">
                اطلاعات/شرح {guaranteeTypes.find((x) => x.id === gType)?.label}
              </label>
              <input
                className="w-full rounded-xl px-3 py-2
                           bg-white text-neutral-900 border border-black/10 outline-none placeholder:text-neutral-400
                           dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                value={gText}
                onChange={(e) => setGText(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-sm text-neutral-700 dark:text-neutral-300">
                مبلغ{" "}
                {gType === "bank" || gType === "check" || gType === "safte"
                  ? "(ریال)"
                  : ""}
              </label>
              <input
                dir="ltr"
                className="w-full rounded-xl px-3 py-2 font-mono
                           bg-white text-neutral-900 border border-black/10 outline-none placeholder:text-neutral-400
                           dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                value={gAmount}
                onChange={(e) => {
                  const v = e.target.value;
                  const n = parseMoney(v);
                  e.target.value = formatMoney(n);
                  setGAmount(e.target.value);
                }}
                inputMode="numeric"
                placeholder="0"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={onAddOrUpdate}
              className="h-10 px-5 rounded-xl
                         bg-neutral-900 text-white
                         dark:bg-neutral-100 dark:text-neutral-900
                         disabled:opacity-50"
              disabled={parseMoney(gAmount) <= 0}
            >
              {editId ? "ذخیره تغییرات" : "افزودن به لیست"}
            </button>
            {editId && (
              <button
                type="button"
                onClick={() => {
                  setEditId(null);
                  setGType("check");
                  setGText("");
                  setGAmount("");
                  setGTitle("performance");
                  setGTitleOther("");
                }}
                className="h-10 px-4 rounded-xl
                           ring-1 ring-black/10 text-neutral-700 hover:bg-black/5 transition
                           dark:ring-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-800"
              >
                انصراف از ویرایش
              </button>
            )}
          </div>
        </div>

        {/* جدول آیتم‌ها */}
        <TableWrap>
          <div className="text-neutral-900 dark:text-neutral-100 [&_th]:!text-neutral-900 [&_td]:!text-neutral-900 dark:[&_th]:!text-neutral-100 dark:[&_td]:!text-neutral-100">
            <table className="w-full text-sm text-center border border-neutral-200 rounded-xl overflow-hidden dark:border-neutral-800">
              <THead>
                <tr className="bg-neutral-100 text-neutral-900 border-b border-neutral-200 dark:bg-white/5 dark:text-neutral-100 dark:border-neutral-700">
                  <TH className="!text-center !font-semibold">ردیف</TH>
                  <TH className="!text-center !font-semibold">عنوان</TH>
                  <TH className="!text-center !font-semibold">نوع</TH>
                  <TH className="!text-center !font-semibold w-48">مبلغ</TH>
                  <TH className="!text-center !font-semibold w-56">اقدامات</TH>
                </tr>
              </THead>
              <tbody className="bg-white divide-y divide-neutral-200 dark:bg-transparent dark:divide-neutral-800">
                {(items || []).length === 0 ? (
                  <TR>
                    <TD
                      colSpan={5}
                      className="text-center py-6 bg-neutral-50 text-neutral-800 border-t border-neutral-200 dark:bg-transparent dark:text-neutral-400 dark:border-neutral-800"
                    >
                      موردی ثبت نشده است.
                    </TD>
                  </TR>
                ) : (
                  items.map((it, idx) => (
                    <TR
                      key={it.id}
                      className="odd:bg-neutral-50 even:bg-neutral-100/70 hover:bg-neutral-200/40 dark:odd:bg-transparent dark:even:bg-white/5 dark:hover:bg-white/10"
                    >
                      <TD className="px-3 py-3 !text-neutral-900 dark:!text-neutral-100">
                        {idx + 1}
                      </TD>
                      <TD className="px-3 py-3 truncate !text-neutral-900 dark:!text-neutral-100">
                        {it.titleText}
                      </TD>
                      <TD className="px-3 py-3 !text-neutral-900 dark:!text-neutral-100">
                        {it.typeText}
                      </TD>
                      <TD className="px-3 py-3 font-mono ltr !text-neutral-900 dark:!text-neutral-100">
                        {formatMoney(it.amount || 0)}
                      </TD>
                      <TD className="px-3 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            className="px-3 py-2 rounded-xl ring-1 ring-neutral-200 bg-white text-neutral-800 hover:bg-neutral-100 transition dark:bg-transparent dark:ring-neutral-800 dark:text-neutral-100 dark:hover:bg-white/10"
                            onClick={() => setViewItem(it)}
                          >
                            نمایش
                          </button>
                          <button
                            type="button"
                            className="px-3 py-2 rounded-xl ring-1 ring-neutral-200 bg-white text-neutral-800 hover:bg-neutral-100 transition dark:bg-transparent dark:ring-neutral-800 dark:text-neutral-100 dark:hover:bg-white/10"
                            onClick={() => onEdit(it.id)}
                          >
                            ویرایش
                          </button>
                          <button
                            type="button"
                            className="px-3 py-2 rounded-xl border border-red-500 text-red-600 hover:bg-red-600 hover:text-white transition dark:border-red-600 dark:text-red-400"
                            onClick={() => onDelete(it.id)}
                          >
                            حذف
                          </button>
                        </div>
                      </TD>
                    </TR>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TableWrap>

        {/* پاپ‌آپ نمایش */}
        {viewItem && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div
              className="bg-white rounded-2xl p-5 w-[95%] max-w-3xl ring-1 ring-black/10
                            text-neutral-900
                            dark:bg-neutral-900 dark:ring-neutral-800 dark:text-neutral-100"
            >
              <div className="text-lg font-bold mb-2">جزئیات تضمین</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <b>پروژه:</b>{" "}
                  {selectedProject
                    ? `${selectedProject.code || "—"} — ${
                        selectedProject.name || "—"
                      }`
                    : "—"}
                </div>
                <div>
                  <b>عنوان تضمین:</b> {viewItem.titleText || "—"}
                </div>
                <div>
                  <b>نوع تضمین:</b> {viewItem.typeText || "—"}
                </div>
                <div>
                  <b>مبلغ:</b>{" "}
                  <span className="font-mono ltr">
                    {formatMoney(viewItem.amount || 0)}
                  </span>
                </div>
                <div className="md:col-span-2">
                  <b>شرح/اطلاعات:</b> {viewItem.extra || "—"}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setViewItem(null)}
                  className="h-10 px-6 rounded-xl
                                   bg-neutral-900 text-white
                                   dark:bg-neutral-100 dark:text-neutral-900"
                >
                  بستن
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
