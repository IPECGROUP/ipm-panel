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

// ✅ FontSize (بدون پکیج رسمی)
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

// ✅ Align بدون پکیج
const SimpleTextAlign = Extension.create({
  name: "simpleTextAlign",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          textAlign: {
            default: null,
            parseHTML: (el) => el.style.textAlign || null,
            renderHTML: (attrs) => {
              if (!attrs.textAlign) return {};
              return { style: `text-align: ${attrs.textAlign}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setTextAlign:
        (align) =>
        ({ state, dispatch }) => {
          const { tr, selection } = state;
          const { from, to } = selection;

          state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.type.name === "paragraph" || node.type.name === "heading") {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, textAlign: align });
            }
          });

          if (dispatch) dispatch(tr);
          return true;
        },
      unsetTextAlign:
        () =>
        ({ state, dispatch }) => {
          const { tr, selection } = state;
          const { from, to } = selection;

          state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.type.name === "paragraph" || node.type.name === "heading") {
              const nextAttrs = { ...node.attrs };
              delete nextAttrs.textAlign;
              tr.setNodeMarkup(pos, undefined, nextAttrs);
            }
          });

          if (dispatch) dispatch(tr);
          return true;
        },
    };
  },
});

// ✅ Row Height: ارتفاع هر ردیف جداگانه (برای row-resize اکسل‌طور)
const RowHeight = Extension.create({
  name: "rowHeight",
  addGlobalAttributes() {
    return [
      {
        types: ["tableRow"],
        attributes: {
          rowHeight: {
            default: null,
            parseHTML: (el) => {
              const h = el?.style?.height || "";
              const m = String(h).match(/(\d+)\s*px/);
              return m ? Number(m[1]) : null;
            },
            renderHTML: (attrs) => {
              if (!attrs.rowHeight) return {};
              return { style: `height:${attrs.rowHeight}px` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setActiveRowHeight:
        (heightPx) =>
        ({ state, dispatch }) => {
          const { selection } = state;
          const $from = selection.$from;

          let rowDepth = -1;
          for (let d = $from.depth; d > 0; d--) {
            if ($from.node(d).type.name === "tableRow") {
              rowDepth = d;
              break;
            }
          }
          if (rowDepth === -1) return false;

          const rowPos = $from.before(rowDepth);
          const rowNode = state.doc.nodeAt(rowPos);
          if (!rowNode) return false;

          const nextAttrs = { ...rowNode.attrs, rowHeight: Math.max(18, Math.min(240, heightPx)) };
          const tr = state.tr.setNodeMarkup(rowPos, undefined, nextAttrs);
          if (dispatch) dispatch(tr);
          return true;
        },
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

function PageFrame({ templateUrl, children, className = "" }) {
  return (
    <div
      className={[
        "mx-auto w-full max-w-[560px]",
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
      <div className="absolute inset-0 bg-black/40" onMouseDown={onClose} role="presentation" />
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
  // ✅ تمپلیت شما (عکس ارسال‌شده را بذار: public/images/letter-template.png)
  const TEMPLATE_URL = "/images/letter-template.png";

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

  // ✅ Excel-like Row Resize state
  const rowResizeRef = useRef({
    active: false,
    rowEl: null,
    startY: 0,
    startH: 0,
  });

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
      SimpleTextAlign,
      RowHeight, // ✅ ارتفاع مستقل هر ردیف
      Placeholder.configure({ placeholder: "اینجا شروع به نوشتن کنید…" }),
      TableKit.configure({
        table: { resizable: true }, // ✅ تغییر اندازه ستون‌ها با موس (ستون مستقل)
      }),
    ],
    content: ``,
    editorProps: {
      attributes: {
        dir: "rtl",
        class: ["outline-none", "text-[14px] leading-7", "text-black dark:text-neutral-100"].join(" "),
      },
    },
    onUpdate: ({ editor }) => setPreviewHtml(editor.getHTML()),
  });

  const currentFont = editor?.getAttributes("textStyle")?.fontFamily || FONTS[0].value;
  const currentSize = editor?.getAttributes("textStyle")?.fontSize || "14px";

  const insertTable3x3 = () => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();

  const alignRight = () => editor?.chain().focus().setTextAlign("right").run();
  const alignCenter = () => editor?.chain().focus().setTextAlign("center").run();
  const alignLeft = () => editor?.chain().focus().setTextAlign("left").run();
  const alignJustify = () => editor?.chain().focus().setTextAlign("justify").run();

  // ✅ کلیک هرجای صفحه → کرسر همانجا + focus
  const handlePageMouseDown = (e) => {
    if (!editor) return;

    // اگر روی خود ProseMirror کلیک شد، بذار خودش هندل کنه
    const pm = editorWrapRef.current?.querySelector?.(".ProseMirror");
    if (pm && pm.contains(e.target)) return;

    // در ناحیه صفحه کلیک شده: selection را نزدیک همان نقطه قرار بده
    try {
      const pos = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
      if (pos?.pos != null) {
        editor.commands.focus();
        editor.commands.setTextSelection(pos.pos);
      } else {
        editor.commands.focus("end");
      }
    } catch {
      editor.commands.focus("end");
    }
  };

  // ✅ Row resize (Excel-like): موس نزدیک مرز پایین TR → drag ارتفاع همان ردیف
  useEffect(() => {
    if (!editor) return;

    const wrap = editorWrapRef.current;
    if (!wrap) return;

    const isNearBottomEdge = (rect, y, threshold = 4) => Math.abs(y - rect.bottom) <= threshold;

    const onMove = (e) => {
      if (!wrap) return;

      // Drag فعال
      if (rowResizeRef.current.active) {
        const dy = e.clientY - rowResizeRef.current.startY;
        const nextH = Math.max(18, Math.min(240, rowResizeRef.current.startH + dy));
        // ارتفاع را روی همان TR به صورت attribute ذخیره کن
        // (برای اینکه node درست پیدا شود، selection را داخل همان row نگه می‌داریم)
        editor.commands.setActiveRowHeight(nextH);
        e.preventDefault();
        return;
      }

      // Drag غیرفعال: فقط cursor را مثل اکسل تغییر بده
      const pm = wrap.querySelector(".ProseMirror");
      if (!pm) return;

      const t = e.target;
      const tr = t?.closest?.("tr");
      if (!tr) {
        pm.classList.remove("resize-row-cursor");
        return;
      }

      const rect = tr.getBoundingClientRect();
      if (isNearBottomEdge(rect, e.clientY)) {
        pm.classList.add("resize-row-cursor");
      } else {
        pm.classList.remove("resize-row-cursor");
      }
    };

    const onDown = (e) => {
      if (!wrap) return;
      const pm = wrap.querySelector(".ProseMirror");
      if (!pm) return;

      const tr = e.target?.closest?.("tr");
      if (!tr) return;

      const rect = tr.getBoundingClientRect();
      if (!isNearBottomEdge(rect, e.clientY)) return;

      // شروع drag
      rowResizeRef.current.active = true;
      rowResizeRef.current.rowEl = tr;
      rowResizeRef.current.startY = e.clientY;
      rowResizeRef.current.startH = rect.height;

      document.body.style.userSelect = "none";
      document.body.style.cursor = "row-resize";

      e.preventDefault();
    };

    const onUp = () => {
      if (!rowResizeRef.current.active) return;
      rowResizeRef.current.active = false;
      rowResizeRef.current.rowEl = null;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    wrap.addEventListener("mousemove", onMove, { passive: false });
    wrap.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);

    return () => {
      wrap.removeEventListener("mousemove", onMove);
      wrap.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, [editor]);

  return (
    <div className="p-4 md:p-6">
      <style>{`
        /* Column resize handle (واضح‌تر) */
        .ProseMirror table { position: relative; }
        .ProseMirror .column-resize-handle {
          position: absolute;
          top: -2px;
          right: -2px;
          bottom: -2px;
          width: 6px;
          background: rgba(0,0,0,0.08);
          pointer-events: none;
          opacity: 0;
          transition: opacity .12s ease;
        }
        .ProseMirror table:hover .column-resize-handle { opacity: 1; }
        .ProseMirror.resize-cursor { cursor: col-resize; }
        .dark .ProseMirror .column-resize-handle { background: rgba(255,255,255,0.14); }

        /* Row resize cursor */
        .ProseMirror.resize-row-cursor { cursor: row-resize; }
      `}</style>

      <Card className="rounded-2xl border border-black/10 bg-white overflow-hidden dark:bg-neutral-950 dark:border-neutral-800">
        {/* Top Controls */}
        <div className="p-3 md:p-4 border-b border-black/10 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
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

          <IconBtn title="راست‌چین" disabled={!editor} onClick={alignRight}>
            ↦
          </IconBtn>
          <IconBtn title="وسط‌چین" disabled={!editor} onClick={alignCenter}>
            ║
          </IconBtn>
          <IconBtn title="چپ‌چین" disabled={!editor} onClick={alignLeft}>
            ↤
          </IconBtn>
          <IconBtn title="Justify" disabled={!editor} onClick={alignJustify}>
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

          <PrimaryBtn disabled={!editor} onClick={() => setPreviewOpen(true)}>
            پیش‌نمایش
          </PrimaryBtn>
        </div>

        {/* Editor Area */}
        <div className="p-4 md:p-5 bg-neutral-50 dark:bg-neutral-900">
          <div
            ref={editorWrapRef}
            className={[
              "relative",
              "mx-auto w-full max-w-[560px]",
              "max-h-[640px] overflow-auto rounded-2xl",
              "border border-black/10 bg-white dark:bg-neutral-950 dark:border-neutral-800",

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
            onMouseDownCapture={handlePageMouseDown}
          >
            <PageFrame templateUrl={TEMPLATE_URL}>
              {/* ناحیه متن: مطابق سربرگ/پاورقی این تمپلیت تنظیم شده */}
              <div className="h-full w-full pt-[110px] pb-[70px] px-[56px]">
                <EditorContent editor={editor} />
              </div>
            </PageFrame>
          </div>

          <div className="mt-4 flex justify-center">
            <PrimaryBtn disabled={!editor} onClick={() => setPreviewOpen(true)}>
              پیش‌نمایش
            </PrimaryBtn>
          </div>
        </div>
      </Card>

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)}>
        <PageFrame templateUrl={TEMPLATE_URL} className="max-w-[760px]">
          <div className="h-full w-full pt-[110px] pb-[70px] px-[56px]">
            <div style={{ fontFamily: "Vazirmatn, sans-serif" }} dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </PageFrame>
      </Modal>
    </div>
  );
}
