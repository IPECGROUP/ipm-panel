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

function MiniIconBtn({ disabled, onClick, children, title }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={[
        "h-8 w-8 rounded-lg border border-black/10 bg-white text-black hover:bg-black/5",
        "disabled:opacity-40 disabled:hover:bg-white",
        "dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 dark:hover:bg-white/10",
        "grid place-items-center",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function TestEditorPage() {
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
  const [tableUi, setTableUi] = useState({ open: false, left: 0, top: 0 });

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
    // ✅ همه متن‌های دمو/تست حذف شد
    content: ``,
    editorProps: {
      attributes: {
        dir: "rtl",
        class: [
          "min-h-[420px] p-4 outline-none",
          "text-[14px] leading-7",
          "bg-white text-black",
          "dark:bg-neutral-900 dark:text-neutral-100",
        ].join(" "),
      },
    },
  });

  // ✅ نمایش کنترل‌های جدول وقتی داخل جدول هستیم (دکمه‌های + / - برای سطر/ستون)
  useEffect(() => {
    if (!editor) return;

    const updateTableUi = () => {
      const isInTable = editor.isActive("table");
      if (!isInTable) {
        setTableUi((p) => (p.open ? { ...p, open: false } : p));
        return;
      }

      const wrap = editorWrapRef.current;
      if (!wrap) return;

      // موقعیت نسبت به wrapper ادیتور
      const selFrom = editor.state.selection?.from ?? 0;
      const c = editor.view.coordsAtPos(selFrom);
      const r = wrap.getBoundingClientRect();

      // نزدیک کرسر؛ طوری که داخل ادیتور/روی جدول حس شود
      const left = Math.max(8, Math.min(c.left - r.left - 10, r.width - 160));
      const top = Math.max(8, Math.min(c.top - r.top - 44, r.height - 56));

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

  return (
    <div className="p-4 md:p-6">
      <Card className="rounded-2xl border border-black/10 bg-white overflow-hidden dark:bg-neutral-950 dark:border-neutral-800">
        {/* Header (Logo) */}
        <div className="p-4 border-b border-black/10 dark:border-neutral-800 bg-white dark:bg-neutral-950">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src="/images/login_page_header.png"
                alt="سربرگ"
                className="h-12 md:h-14 object-contain"
              />
            </div>
          </div>
        </div>

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

        {/* Editor */}
        <div
          ref={editorWrapRef}
          className={[
            "relative",

            // جدول‌ها
            "[&_table]:w-full [&_table]:border-collapse [&_table]:my-3",
            "[&_td]:border [&_th]:border [&_td]:border-black/20 [&_th]:border-black/20",
            "dark:[&_td]:border-neutral-700 dark:[&_th]:border-neutral-700",
            "[&_th]:bg-black/5 dark:[&_th]:bg-white/10",
            "[&_td]:p-2 [&_th]:p-2",

            // لیست‌ها
            "[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pr-6 [&_.ProseMirror_ul]:my-2",
            "[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pr-6 [&_.ProseMirror_ol]:my-2",
            "[&_.ProseMirror_li]:my-1",
          ].join(" ")}
          style={{ fontFamily: "Vazirmatn, sans-serif" }}
        >
          {/* ✅ کنترل استاندارد جدول: اضافه/حذف سطر و ستون */}
          {tableUi.open && (
            <div
              className={[
                "absolute z-20",
                "rounded-xl border border-black/10 bg-white/95 backdrop-blur px-2 py-2 shadow-sm",
                "dark:bg-neutral-950/90 dark:border-neutral-800",
              ].join(" ")}
              style={{ left: tableUi.left, top: tableUi.top }}
            >
              <div className="flex items-center gap-2">
                <MiniIconBtn disabled={!editor} onClick={tableAddRow} title="Row +">
                  +
                </MiniIconBtn>
                <MiniIconBtn disabled={!editor} onClick={tableDelRow} title="Row -">
                  −
                </MiniIconBtn>

                <div className="h-6 w-px bg-black/10 dark:bg-white/10 mx-1" />

                <MiniIconBtn disabled={!editor} onClick={tableAddCol} title="Col +">
                  +
                </MiniIconBtn>
                <MiniIconBtn disabled={!editor} onClick={tableDelCol} title="Col -">
                  −
                </MiniIconBtn>
              </div>
            </div>
          )}

          <EditorContent editor={editor} />
        </div>
      </Card>
    </div>
  );
}
