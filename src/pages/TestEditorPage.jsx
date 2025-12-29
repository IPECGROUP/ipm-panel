// src/pages/TestEditorPage.jsx
import React, { useMemo, useState } from "react";
import Card from "../components/ui/Card.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import { isMainAdminUser } from "../utils/auth";

import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";

function faToday() {
  try {
    return new Intl.DateTimeFormat("fa-IR").format(new Date());
  } catch {
    // fallback
    const d = new Date();
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  }
}

function makeDemoLetterNo() {
  // فقط برای دمو: بر اساس تاریخ یک شماره نمونه بساز
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}${day}-001`;
}

export default function TestEditorPage() {
  const { user } = useAuth();
  const isMainAdmin = isMainAdminUser(user);

  const todayFa = useMemo(() => faToday(), []);
  const demoNo = useMemo(() => makeDemoLetterNo(), []);

  const initialHtml = useMemo(() => {
    // سربرگ داخل محتوای ادیتور (برای دمو)
    return `
      <div style="border-bottom:1px solid rgba(0,0,0,.15); padding-bottom:12px; margin-bottom:14px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
          <img src="/images/login_page_header.png" alt="سربرگ" style="height:54px; object-fit:contain;" />
          <div style="text-align:left; font-size:12px; line-height:1.7; color:rgba(0,0,0,.75);">
            <div><strong>شماره:</strong> ${demoNo}</div>
            <div><strong>تاریخ:</strong> ${todayFa}</div>
          </div>
        </div>
        <div style="margin-top:8px; font-size:12px; color:rgba(0,0,0,.7);">
          آدرس: … | تلفن: … | ایمیل: …
        </div>
      </div>

     
    `;
  }, [todayFa, demoNo]);

  const [value, setValue] = useState(initialHtml);

  const editorConfig = useMemo(
    () => ({
      language: "fa",
      toolbar: [
        "heading",
        "|",
        "bold",
        "italic",
        "underline",
        "strikethrough",
        "link",
        "|",
        "bulletedList",
        "numberedList",
        "todoList",
        "|",
        "alignment",
        "|",
        "insertTable",
        "blockQuote",
        "codeBlock",
        "|",
        "undo",
        "redo",
      ],
      table: {
        contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"],
      },
    }),
    []
  );

  if (!isMainAdmin) {
    return (
      <div className="p-4">
        <Card className="rounded-2xl border border-black/10 bg-white p-4 text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
          <div className="text-sm">دسترسی ندارید.</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Card className="rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
        <div className="px-4 py-3 border-b border-black/10 dark:border-neutral-800">
          <div className="text-sm md:text-base font-semibold">دمو ادیتور نامه (Word-like)</div>
          <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
            فقط دمو — ذخیره ندارد | لوگو از: <span className="font-mono">/images/login_page_header.png</span>
          </div>
        </div>

        <div className="p-4">
          {/* Canvas (کاغذ A4) */}
          <div className="flex justify-center">
            <div className="w-full max-w-[920px]">
              <div
                className="
                  rounded-2xl border border-black/10 bg-white text-black overflow-hidden
                  dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800
                "
              >
                {/* ناحیه کاغذ */}
                <div className="bg-neutral-100/70 p-4 dark:bg-neutral-950">
                  <div
                    className="
                      mx-auto bg-white text-black
                      shadow-[0_10px_30px_rgba(0,0,0,0.12)]
                      dark:bg-white
                      "
                    style={{
                      width: "100%",
                      maxWidth: 794, // حدود عرض A4 در 96dpi
                      minHeight: 1123, // حدود ارتفاع A4
                      padding: "28px 34px", // حاشیه‌های کاغذ
                      borderRadius: 14,
                    }}
                  >
                    {/* CKEditor */}
                    <div
                      dir="rtl"
                      className="
                        [&_.ck-editor__editable]:min-h-[920px]
                        [&_.ck-editor__editable]:p-0
                        [&_.ck-editor__editable]:outline-none
                        [&_.ck-editor__editable]:shadow-none
                        [&_.ck-editor__editable]:border-0
                      "
                    >
                      <CKEditor
                        editor={ClassicEditor}
                        config={editorConfig}
                        data={value}
                        onChange={(_, editor) => setValue(editor.getData())}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer ابزار/راهنما */}
                <div className="px-4 py-3 border-t border-black/10 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400">
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
