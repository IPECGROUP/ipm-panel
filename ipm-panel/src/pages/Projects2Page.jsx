// src/pages/Projects2Page.jsx
import React, { useState } from "react";
import Shell from "../components/layout/Shell.jsx";
import Card from "../components/ui/Card.jsx";
import { PrimaryBtn } from "../components/ui/Button.jsx";

function Projects2Page() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  const addRow = () => {
    setErr("");
    const c = (code || "").trim();
    const n = (name || "").trim();
    if (!c && !n) {
      setErr("کد یا نام پروژه را وارد کنید");
      return;
    }
    setRows((r) => [...r, { id: r.length + 1, code: c, name: n }]);
    setCode("");
    setName("");
  };

  return (
    <Shell>
      <Card className="p-5 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-black dark:text-neutral-100">
            پروژه‌ها ۲
          </h1>
        </div>

        {/* Form */}
        <div
          className="border border-black/10 rounded-2xl p-3 md:p-4 mb-5 bg-white 
                     dark:bg-neutral-900 dark:border-neutral-800"
          dir="rtl"
        >
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 md:items-end">
            <div>
              <label className="block text-sm mb-1 text-black/70 dark:text-neutral-300">
                کد پروژه :
              </label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full border border-black/15 rounded-xl px-3 py-2 
                           bg-white text-black ltr 
                           dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                placeholder=""
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-black/70 dark:text-neutral-300">
                نام پروژه :
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-black/15 rounded-xl px-3 py-2 
                           bg-white text-black 
                           dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                placeholder=""
              />
            </div>
            <div className="pt-0 md:pt-1.5">
              <PrimaryBtn onClick={addRow} className="w-full h-10">
                افزودن
              </PrimaryBtn>
            </div>
          </div>
          {err && <div className="text-sm text-red-600 mt-2">{err}</div>}
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border bg-white text-neutral-900 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
          <table className="min-w-full text-sm text-right" dir="rtl">
            <thead className="bg-neutral-100 text-neutral-900 border-b border-neutral-200 dark:bg-white/5 dark:text-neutral-100 dark:border-neutral-700">
              <tr>
                <th className="p-3 w-24 text-right font-semibold">ردیف</th>
                <th className="p-3 w-40 text-right font-semibold">کد پروژه</th>
                <th className="p-3 text-right font-semibold">نام پروژه</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="p-5 text-center text-neutral-700 bg-neutral-50 dark:bg-transparent dark:text-neutral-400"
                  >
                    موردی ثبت نشده.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr
                    key={r.id}
                    className="odd:bg-neutral-50 even:bg-neutral-100/70 hover:bg-neutral-200/40 transition-colors 
                               dark:odd:bg-transparent dark:even:bg-white/5 dark:hover:bg-white/10"
                  >
                    <td className="p-3">{i + 1}</td>
                    <td className="p-3 ltr tabular-nums">{r.code || "—"}</td>
                    <td className="p-3">{r.name || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </Shell>
  );
}

export default Projects2Page;
