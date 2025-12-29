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
import TextAlign from "@tiptap/extension-text-align";

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
      onMouseDown={(e) => e.preventDefault()}
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

function PrimaryBtn({ onClick, children, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "h-10 px-4 rounded-xl bg-black text-white hover:bg-black/90",
        "disabled:opacity-40",
        "dark:bg-white dark:text-black dark:hover:bg-white/90",
        "text-sm",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

// ✅ مینیمال دکمه‌های + / −
function MiniPMBtn({ disabled, onClick, children, title }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
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

// ✅ هندل درگ برای ردیف‌ها (حس اکسل) — این یکی padding ردیف‌ها رو تغییر می‌ده
function DragHandleY({ onDown }) {
  return (
    <button
      type="button"
      title="تغییر ارتفاع ردیف‌ها"
      onMouseDown={onDown}
      className={[
        "h-7 w-7 rounded-full border border-black/10 bg-white/95 text-black hover:bg-black/5",
        "dark:bg-neutral-900/90 dark:text-neutral-100 dark:border-neutral-800 dark:hover:bg-white/10",
        "grid place-items-center",
        "cursor-ns-resize",
      ].join(" ")}
    >
      ↕
    </button>
  );
}

function PageFrame({ templateUrl, children, className = "" }) {
  return (
    <div
      className={[
        "mx-auto w-full max-w-[560px]", // ✅ کوچیک‌تر
        "aspect-[210/297]",
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

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000]">
      <div
        className="absolute inset-0 bg-black/40"
        onMouseDown={onClose}
        role="presentation"
      />
      <div className="absolute inset-0 p-4 md:p-8 overflow-auto">
        <div
          className={[
            "mx-auto w-full max-w-[980px]",
            "rounded-2xl border border-black/10 bg-white text-black shadow-xl",
            "dark:bg-neutral-950 dark:text-neutral-100 dark:border-neutral-800",
          ].join(" ")}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="p-3 md:p-4 border-b border-black/10 dark:border-neutral-800 flex items-center justify-between">
            <div className="text-sm font-semibold">پیش‌نمایش</div>
            <button
              type="button"
              onClick={onClose}
              className={[
                "h-10 w-10 rounded-xl border border-black/10 bg-white hover:bg-black/5",
                "dark:bg-neutral-900 dark:border-neutral-800 dark:hover:bg-white/10",
                "grid place-items-center",
              ].join(" ")}
              title="بستن"
            >
              ✕
            </button>
          </div>
          <div className="p-4 md:p-6 bg-neutral-50 dark:bg-neutral-900">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function TestEditorPage() {
  const TEMPLATE_URL = "/images/letter-template.png";
  const TOP_LOGO_URL = "/images/login_page_header.png";

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

  const [previewHtml, setPreviewHtml] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const [tableUi, setTableUi] = useState({ open: false, left: 0, top: 0 });
  const [tablePad, setTablePad] = useState(8);

  // درگ ارتفاع ردیف‌ها
  const dragRef = useRef({ dragging: false, startY: 0, startPad: 8 });

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
      TextAlign.configure({
        types: ["heading", "paragraph"],
        defaultAlignment: "right",
      }),
      Placeholder.configure({ placeholder: "اینجا شروع به نوشتن کنید…" }),
      TableKit.configure({
        table: { resizable: true }, // ✅ ستون‌ها مثل اکسل (درگ مرز ستون)
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
    onUpdate: ({ editor }) => setPreviewHtml(editor.getHTML()),
  });

  // ✅ جای‌گذاری کنترل‌ها روی جدول
  useEffect(() => {
    if (!editor) return;

    const findClosestTableEl = () => {
      try {
        const { from } = editor.state.selection;
        const domAt = editor.view.domAtPos(from);
        let el = domAt?.node;
        if (!el) return null;
        if (el.nodeType === 3) el = el.parentElement;
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

      const CONTROL_W = 260;
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

  // ✅ درگ برای تغییر tablePad (حس اکسل برای ارتفاع)
  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current.dragging) return;
      const dy = e.clientY - dragRef.current.startY;
      const next = Math.max(4, Math.min(18, dragRef.current.startPad + Math.round(dy / 6)));
      setTablePad(next);
    };
    const onUp = () => {
      if (!dragRef.current.dragging) return;
      dragRef.current.dragging = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const currentFont = editor?.getAttributes("textStyle")?.fontFamily || FONTS[0].value;
  const currentSize = editor?.getAttributes("textStyle")?.fontSize || "14px";

  const insertTable3x3 = () => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  const tableAddRow = () => editor?.chain().focus().addRowAfter().run();
  const tableDelRow = () => editor?.chain().focus().deleteRow().run();
  const tableAddCol = () => editor?.chain().focus().addColumnAfter().run();
  const tableDelCol = () => editor?.chain().focus().deleteColumn().run();

  const alignRight = () => editor?.chain().focus().setTextAlign("right").run();
  const alignCenter = () => editor?.chain().focus().setTextAlign("center").run();
  const alignLeft = () => editor?.chain().focus().setTextAlign("left").run();
  const alignJustify = () => editor?.chain().focus().setTextAlign("justify").run();

  return (
    <div className="p-4 md:p-6">
      {/* CSS لازم برای هندل تغییر اندازه ستون‌ها (مثل اکسل) */}
      <style>{`
        .ProseMirror table { position: relative; }
        .ProseMirror .column-resize-handle {
          position: absolute;
          top: -2px;
          right: -2px;
          bottom: -2px;
          width: 5px;
          background: rgba(0,0,0,0.08);
          pointer-events: none;
          opacity: 0;
          transition: opacity .12s ease;
        }
        .ProseMirror table:hover .column-resize-handle { opacity: 1; }
        .ProseMirror.resize-cursor { cursor: col-resize; }
        .dark .ProseMirror .column-resize-handle { background: rgba(255,255,255,0.12); }
      `}</style>

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

          <IconBtn title="Bold" active={editor?.isActive("bold")} disabled={!editor} onClick={() => editor?.chain().focus().toggleBold().run()}>
            B
          </IconBtn>
          <IconBtn title="Italic" active={editor?.isActive("italic")} disabled={!editor} onClick={() => editor?.chain().focus().toggleItalic().run()}>
            I
          </IconBtn>
          <IconBtn title="Underline" active={editor?.isActive("underline")} disabled={!editor} onClick={() => editor?.chain().focus().toggleUnderline().run()}>
            U
          </IconBtn>

          <div className="h-6 w-px bg-black/10 dark:bg-white/10 mx-1" />

          <IconBtn title="راست‌چین" active={editor?.isActive({ textAlign: "right" })} disabled={!editor} onClick={alignRight}>
            ↦
          </IconBtn>
          <IconBtn title="وسط‌چین" active={editor?.isActive({ textAlign: "center" })} disabled={!editor} onClick={alignCenter}>
            ║
          </IconBtn>
          <IconBtn title="چپ‌چین" active={editor?.isActive({ textAlign: "left" })} disabled={!editor} onClick={alignLeft}>
            ↤
          </IconBtn>
          <IconBtn title="Justify" active={editor?.isActive({ textAlign: "justify" })} disabled={!editor} onClick={alignJustify}>
            ☰
          </IconBtn>

          <div className="h-6 w-px bg-black/10 dark:bg-white/10 mx-1" />

          <IconBtn title="Bullet List" active={editor?.isActive("bulletList")} disabled={!editor} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
            ••
          </IconBtn>
          <IconBtn title="Ordered List" active={editor?.isActive("orderedList")} disabled={!editor} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
            1.
          </IconBtn>

          <div className="flex-1" />

          {/* ✅ دکمه پیش‌نمایش */}
          <PrimaryBtn disabled={!editor} onClick={() => setPreviewOpen(true)}>
            پیش‌نمایش
          </PrimaryBtn>
        </div>

        {/* Editor Area */}
        <div className="p-4 md:p-5 bg-neutral-50 dark:bg-neutral-900">
          {/* ✅ لوگو بالای تمپلیت */}
          <div className="mx-auto w-full max-w-[560px] mb-3">
            <img src={TOP_LOGO_URL} alt="لوگو" className="h-12 md:h-14 object-contain" />
          </div>

          <div
            ref={editorWrapRef}
            className={[
              "relative",
              "mx-auto w-full max-w-[560px]",

              // ✅ ارتفاع باکس محدودتر تا اسکرول صفحه زیاد نشه
              "max-h-[620px] overflow-auto rounded-2xl",

              // جدول‌ها
              "[&_table]:w-full [&_table]:border-collapse [&_table]:my-3",
              "[&_td]:border [&_th]:border [&_td]:border-black/20 [&_th]:border-black/20",
              "dark:[&_td]:border-neutral-700 dark:[&_th]:border-neutral-700",
              "[&_th]:bg-black/5 dark:[&_th]:bg-white/10",
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
            <PageFrame templateUrl={TEMPLATE_URL}>
              <div className="h-full w-full pt-[110px] pb-[70px] px-[56px]">
                {/* ✅ کنترل جدول */}
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

                      {/* حس اکسل برای ارتفاع */}
                      <DragHandleY
                        onDown={(e) => {
                          e.preventDefault();
                          dragRef.current.dragging = true;
                          dragRef.current.startY = e.clientY;
                          dragRef.current.startPad = tablePad;
                          document.body.style.userSelect = "none";
                          document.body.style.cursor = "ns-resize";
                        }}
                      />
                    </div>
                  </div>
                )}

                <EditorContent editor={editor} />
              </div>
            </PageFrame>
          </div>

          {/* ✅ دکمه پیش‌نمایش پایین صفحه (طبق خواسته‌ات) */}
          <div className="mt-4 flex justify-center">
            <PrimaryBtn disabled={!editor} onClick={() => setPreviewOpen(true)}>
              پیش‌نمایش
            </PrimaryBtn>
          </div>
        </div>
      </Card>

      {/* ✅ Preview Modal */}
      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)}>
        <div className="mx-auto w-full max-w-[560px] mb-3">
          <img src={TOP_LOGO_URL} alt="لوگو" className="h-12 md:h-14 object-contain" />
        </div>

        <PageFrame templateUrl={TEMPLATE_URL} className="max-w-[760px]">
          <div className="h-full w-full pt-[110px] pb-[70px] px-[56px]">
            <div
              style={{ fontFamily: "Vazirmatn, sans-serif" }}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </PageFrame>
      </Modal>
    </div>
  );
}
