// src/pages/TestEditorPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Card from "../components/ui/Card.jsx";
import { useEditor, EditorContent } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle, FontFamily } from "@tiptap/extension-text-style";
import { TableKit } from "@tiptap/extension-table";
import Placeholder from "@tiptap/extension-placeholder";

// ✅ FontSize: چون پکیج رسمی @tiptap/extension-font-size وجود نداره/نصب نیست
const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize?.replace(/['"]/g, "") || null,
            renderHTML: (attrs) => {
              if (!attrs.fontSize) return {};
              return { style: `font-size: ${attrs.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

function IconBtn({ active, disabled, onClick, children, title, className = "" }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={[
        "h-10 w-10 rounded-xl border border-black/10 bg-white text-black hover:bg-black/5",
        "disabled:opacity-40 disabled:hover:bg-white",
        "dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 dark:hover:bg-white/10",
        active ? "ring-2 ring-black/30 dark:ring-white/20" : "",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function SmallBtn({ onClick, children, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "h-10 px-3 rounded-xl border border-black/10 bg-white text-black hover:bg-black/5",
        "disabled:opacity-40 disabled:hover:bg-white",
        "dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 dark:hover:bg-white/10",
        "text-sm",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

// ✅ مینیمال: دکمه‌های + / − گرد
function MiniPMBtn({ disabled, onClick, children, title }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => {
        // خیلی مهم: نذاریم selection از جدول/ادیتور خارج بشه
        e.preventDefault();
      }}
      onClick={onClick}
      className={[
        "h-7 w-7 rounded-full border border-black/10 bg-white/95 text-black hover:bg-black/5",
        "disabled:opacity-40",
        "dark:bg-neutral-900/90 dark:text-neutral-100 dark:border-neutral-800 dark:hover:bg-white/10",
        "grid place-items-center text-sm leading-none",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function PageFrame({ templateUrl, children, className = "" }) {
  return (
    <div
      className={[
        "mx-auto w-full max-w-[860px]",
        "aspect-[210/297]", // A4
        "rounded-2xl border border-black/10 overflow-hidden",
        "bg-white dark:bg-neutral-950 dark:border-neutral-800",
        className,
      ].join(" ")}
      style={{
        backgroundImage: `url(${templateUrl})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "100% 100%",
      }}
    >
      {children}
    </div>
  );
}

export default function TestEditorPage() {
  // ✅ تمپلیت شما (این فایل را در public/images/letter-template.png قرار بده)
  const TEMPLATE_URL = "/images/letter-template.png";

  // فونت‌های مجاز
  const FONTS = useMemo(
    () => [
      { label: "Vazirmatn", value: "Vazirmatn, sans-serif" },
      { label: "Tahoma", value: "Tahoma, sans-serif" },
      { label: "Arial", value: "Arial, sans-serif" },
    ],
    []
  );

  const SIZES = useMemo(() => ["12px", "14px", "16px", "18px", "20px", "24px"], []);

  const editorWrapRef = useRef(null);

  // ✅ پیش‌نمایش خروجی
  const [previewHtml, setPreviewHtml] = useState("");

  // ✅ کنترل جدول
  const [tableUi, setTableUi] = useState({ open: false, left: 0, top: 0 });
  const [tablePad, setTablePad] = useState(8); // برای کوچک/بزرگ کردن ردیف‌ها (padding)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      TextStyle,
      FontFamily.configure({ types: ["textStyle"] }),
      FontSize,
      Placeholder.configure({ placeholder: "اینجا شروع به نوشتن کنید…" }),
      TableKit.configure({
        table: { resizable: true },
      }),
    ],
    content: ``,
    editorProps: {
      attributes: {
        dir: "rtl",
        class: [
          "outline-none",
          "text-[14px] leading-7",
          "text-black dark:text-neutral-100",
        ].join(" "),
      },
    },
    onUpdate: ({ editor }) => {
      setPreviewHtml(editor.getHTML());
    },
  });

  // ✅ جای‌گذاری کنترل‌ها روی خود جدول (گوشه‌ی بالا-راستِ جدول)
  useEffect(() => {
    if (!editor) return;

    const findClosestTableEl = () => {
      try {
        const { from } = editor.state.selection;
        const domAt = editor.view.domAtPos(from);
        let el = domAt?.node;
        if (!el) return null;
        if (el.nodeType === 3) el = el.parentElement; // متن → والد
        if (!el) return null;
        return el.closest?.("table") || null;
      } catch {
        return null;
      }
    };

    const updateTableUi = () => {
      const wrap = editorWrapRef.current;
      if (!wrap) return;

      const tableEl = editor.isActive("table") ? findClosestTableEl() : null;
      if (!tableEl) {
        setTableUi((p) => (p.open ? { ...p, open: false } : p));
        return;
      }

      const wrapRect = wrap.getBoundingClientRect();
      const tRect = tableEl.getBoundingClientRect();

      // کنترل‌ها: گوشه‌ی بالا-راست جدول (RTL-friendly)
      const CONTROL_W = 210; // تقریبی
      const leftRaw = tRect.right - wrapRect.left - CONTROL_W - 10;
      const topRaw = tRect.top - wrapRect.top + 10;

      const left = Math.max(10, Math.min(leftRaw, wrapRect.width - CONTROL_W - 10));
      const top = Math.max(10, Math.min(topRaw, wrapRect.height - 60));

      setTableUi({ open: true, left, top });
    };

    updateTableUi();

    editor.on("selectionUpdate", updateTableUi);
    editor.on("transaction", updateTableUi);
    editor.on("focus", updateTableUi);
    editor.on("blur", () => setTableUi((p) => (p.open ? { ...p, open: false } : p)));

    return () => {
      editor.off("selectionUpdate", updateTableUi);
      editor.off("transaction", updateTableUi);
      editor.off("focus", updateTableUi);
      editor.off("blur", () => {});
    };
  }, [editor]);

  const currentFont = editor?.getAttributes("textStyle")?.fontFamily || FONTS[0].value;
  const currentSize = editor?.getAttributes("textStyle")?.fontSize || "14px";

  const insertTable3x3 = () => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const tableAddRow = () => editor?.chain().focus().addRowAfter().run();
  const tableDelRow = () => editor?.chain().focus().deleteRow().run();
  const tableAddCol = () => editor?.chain().focus().addColumnAfter().run();
  const tableDelCol = () => editor?.chain().focus().deleteColumn().run();

  const rowBigger = () => setTablePad((p) => Math.min(18, p + 2));
  const rowSmaller = () => setTablePad((p) => Math.max(4, p - 2));

  return (
    <div className="p-4 md:p-6">
      <Card className="rounded-2xl border border-black/10 bg-white overflow-hidden dark:bg-neutral-950 dark:border-neutral-800">
        {/* Top Controls */}
        <div className="p-4 border-b border-black/10 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
          <div className="flex flex-wrap items-center gap-2">
            <SmallBtn onClick={insertTable3x3} disabled={!editor}>
              افزودن جدول
            </SmallBtn>

            <div className="flex-1" />

            <SmallBtn disabled={!editor} onClick={() => editor?.chain().focus().undo().run()}>
              Undo
            </SmallBtn>
            <SmallBtn disabled={!editor} onClick={() => editor?.chain().focus().redo().run()}>
              Redo
            </SmallBtn>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-black/10 dark:border-neutral-800 bg-white dark:bg-neutral-950">
          <select
            className="h-10 rounded-xl border border-black/10 bg-white px-3 text-black dark:bg-neutral-950 dark:text-neutral-100 dark:border-neutral-800"
            value={currentFont}
            onChange={(e) => editor?.chain().focus().setFontFamily(e.target.value).run()}
          >
            {FONTS.map((f) => (
              <option key={f.label} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <select
            className="h-10 rounded-xl border border-black/10 bg-white px-3 text-black dark:bg-neutral-950 dark:text-neutral-100 dark:border-neutral-800"
            value={currentSize}
            onChange={(e) => editor?.chain().focus().setFontSize(e.target.value).run()}
          >
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s.replace("px", "")}
              </option>
            ))}
          </select>

          <div className="h-6 w-px bg-black/10 dark:bg-white/10 mx-1" />

          <IconBtn
            title="Bold"
            active={editor?.isActive("bold")}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            B
          </IconBtn>
          <IconBtn
            title="Italic"
            active={editor?.isActive("italic")}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            I
          </IconBtn>
          <IconBtn
            title="Underline"
            active={editor?.isActive("underline")}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
          >
            U
          </IconBtn>

          <div className="h-6 w-px bg-black/10 dark:bg-white/10 mx-1" />

          <IconBtn
            title="Bullet List"
            active={editor?.isActive("bulletList")}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            ••
          </IconBtn>
          <IconBtn
            title="Ordered List"
            active={editor?.isActive("orderedList")}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            1.
          </IconBtn>

          <div className="flex-1" />
        </div>

        {/* Editor Area */}
        <div className="p-4 md:p-6 bg-neutral-50 dark:bg-neutral-900">
          <div
            ref={editorWrapRef}
            className={[
              "relative",
              // جدول‌ها
              "[&_table]:w-full [&_table]:border-collapse [&_table]:my-3",
              "[&_td]:border [&_th]:border [&_td]:border-black/20 [&_th]:border-black/20",
              "dark:[&_td]:border-neutral-700 dark:[&_th]:border-neutral-700",
              "[&_th]:bg-black/5 dark:[&_th]:bg-white/10",
              // padding جدول با CSS var
              "[&_td]:p-[var(--table-pad)] [&_th]:p-[var(--table-pad)]",
              // لیست‌ها
              "[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pr-6 [&_.ProseMirror_ul]:my-2",
              "[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pr-6 [&_.ProseMirror_ol]:my-2",
              "[&_.ProseMirror_li]:my-1",
            ].join(" ")}
            style={{
              fontFamily: "Vazirmatn, sans-serif",
              ["--table-pad"]: `${tablePad}px`,
            }}
          >
            {/* ✅ صفحه A4 با تمپلیت */}
            <PageFrame templateUrl={TEMPLATE_URL}>
              {/* ناحیه‌ی متن: کمی فاصله از سربرگ/پاورقی تمپلیت */}
              <div className="h-full w-full pt-[120px] pb-[80px] px-[70px]">
                {/* ✅ کنترل مینیمال داخل خود جدول */}
                {tableUi.open && (
                  <div
                    className={[
                      "absolute z-20",
                      "rounded-xl border border-black/10 bg-white/90 backdrop-blur px-2 py-2 shadow-sm",
                      "dark:bg-neutral-950/85 dark:border-neutral-800",
                    ].join(" ")}
                    style={{ left: tableUi.left, top: tableUi.top }}
                  >
                    <div className="flex items-center gap-2">
                      {/* ستون‌ها */}
                      <div className="flex items-center gap-1">
                        <MiniPMBtn disabled={!editor} onClick={tableAddCol} title="ستون +">
                          +
                        </MiniPMBtn>
                        <MiniPMBtn disabled={!editor} onClick={tableDelCol} title="ستون −">
                          −
                        </MiniPMBtn>
                      </div>

                      <div className="h-6 w-px bg-black/10 dark:bg-white/10 mx-1" />

                      {/* سطرها */}
                      <div className="flex items-center gap-1">
                        <MiniPMBtn disabled={!editor} onClick={tableAddRow} title="سطر +">
                          +
                        </MiniPMBtn>
                        <MiniPMBtn disabled={!editor} onClick={tableDelRow} title="سطر −">
                          −
                        </MiniPMBtn>
                      </div>

                      <div className="h-6 w-px bg-black/10 dark:bg-white/10 mx-1" />

                      {/* کوچک/بزرگ کردن ردیف‌ها */}
                      <div className="flex items-center gap-1">
                        <MiniPMBtn disabled={!editor} onClick={rowBigger} title="درشت‌تر">
                          +
                        </MiniPMBtn>
                        <MiniPMBtn disabled={!editor} onClick={rowSmaller} title="ریزتر">
                          −
                        </MiniPMBtn>
                      </div>
                    </div>
                  </div>
                )}

                <div className="h-full w-full">
                  <EditorContent editor={editor} />
                </div>
              </div>
            </PageFrame>
          </div>
        </div>
      </Card>

      {/* ✅ پیش‌نمایش خروجی زیر ادیتور */}
      <div className="mt-4">
        <Card className="rounded-2xl border border-black/10 bg-white overflow-hidden dark:bg-neutral-950 dark:border-neutral-800">
          <div className="p-4 border-b border-black/10 dark:border-neutral-800 bg-white dark:bg-neutral-950">
            <div className="text-sm font-semibold text-black dark:text-neutral-100">پیش‌نمایش خروجی</div>
          </div>

          <div className="p-4 md:p-6 bg-neutral-50 dark:bg-neutral-900">
            <PageFrame templateUrl={TEMPLATE_URL}>
              <div className="h-full w-full pt-[120px] pb-[80px] px-[70px]">
                <div
                  className="h-full w-full"
                  style={{ fontFamily: "Vazirmatn, sans-serif" }}
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            </PageFrame>
          </div>
        </Card>
      </div>
    </div>
  );
}
