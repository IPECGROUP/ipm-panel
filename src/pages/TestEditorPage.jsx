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
import { TextSelection } from "prosemirror-state";

// ✅ FontSize (بدون پکیج جدا)
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

// ✅ Align بدون پکیج اضافی
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

// ✅ ارتفاع ردیف (برای هر ردیف جداگانه)
const TableRowHeight = Extension.create({
  name: "tableRowHeight",
  addGlobalAttributes() {
    return [
      {
        types: ["tableRow"],
        attributes: {
          rowHeight: {
            default: null,
            parseHTML: (el) => {
              const h = el.style?.height;
              if (!h) return null;
              const n = parseInt(String(h).replace("px", ""), 10);
              return Number.isFinite(n) ? n : null;
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
    const findRowPos = (state) => {
      const { $from } = state.selection;
      for (let d = $from.depth; d >= 0; d--) {
        const n = $from.node(d);
        if (n?.type?.name === "tableRow") {
          const pos = $from.before(d);
          return { pos, node: n };
        }
      }
      return null;
    };

    return {
      incRowHeight:
        () =>
        ({ state, dispatch }) => {
          const found = findRowPos(state);
          if (!found) return false;

          const cur = found.node.attrs?.rowHeight ?? 32;
          const next = Math.min(120, cur + 6);

          const tr = state.tr.setNodeMarkup(found.pos, undefined, {
            ...found.node.attrs,
            rowHeight: next,
          });

          if (dispatch) dispatch(tr);
          return true;
        },
      decRowHeight:
        () =>
        ({ state, dispatch }) => {
          const found = findRowPos(state);
          if (!found) return false;

          const cur = found.node.attrs?.rowHeight ?? 32;
          const next = Math.max(18, cur - 6);

          const tr = state.tr.setNodeMarkup(found.pos, undefined, {
            ...found.node.attrs,
            rowHeight: next,
          });

          if (dispatch) dispatch(tr);
          return true;
        },
      resetRowHeight:
        () =>
        ({ state, dispatch }) => {
          const found = findRowPos(state);
          if (!found) return false;

          const tr = state.tr.setNodeMarkup(found.pos, undefined, {
            ...found.node.attrs,
            rowHeight: null,
          });

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
  // ✅ تمپلیت نامه (همون عکسی که فرستادی)
  const TEMPLATE_URL = "/images/letter-template.png";
  // ✅ لوگو (داخل A4)
  const LOGO_URL = "/images/login_page_header.png";

  const FONTS = useMemo(
    () => [
      { label: "Vazirmatn", value: "Vazirmatn, sans-serif" },
      { label: "Tahoma", value: "Tahoma, sans-serif" },
      { label: "Arial", value: "Arial, sans-serif" },
    ],
    []
  );
  const SIZES = useMemo(() => ["12px", "14px", "16px", "18px", "20px", "24px"], []);

  const scrollRef = useRef(null);
  const pagesRef = useRef(null);
  const pmRef = useRef(null);

  const [previewHtml, setPreviewHtml] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const [tableUi, setTableUi] = useState({ open: false, left: 0, top: 0 });

  // ✅ برای پس‌زمینه چندصفحه‌ای: ارتفاع هر صفحه را از عرض محاسبه می‌کنیم
  const [pageH, setPageH] = useState(0);

  // ✅ تعداد صفحات برای گذاشتن لوگو روی هر صفحه (اختیاری ولی قشنگ و دقیق)
  const [pageCount, setPageCount] = useState(1);

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
      TableRowHeight,
      Placeholder.configure({ placeholder: "اینجا شروع به نوشتن کنید…" }),
      TableKit.configure({
        table: { resizable: true }, // ✅ ستون‌ها جداگانه با موس
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

  // ✅ محاسبه ارتفاع A4 با توجه به عرض واقعی (210x297)
  useEffect(() => {
    const el = pagesRef.current;
    if (!el) return;

    const calc = () => {
      const w = el.getBoundingClientRect().width || 0;
      const h = Math.round(w * (297 / 210));
      setPageH(h);
    };

    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ✅ تعداد صفحات = ارتفاع محتوای ProseMirror / ارتفاع صفحه
  useEffect(() => {
    const el = pmRef.current;
    if (!el || !pageH) return;

    const calc = () => {
      const h = el.scrollHeight || el.getBoundingClientRect().height || 0;
      const c = Math.max(1, Math.ceil(h / pageH));
      setPageCount(c);
    };

    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pageH]);

  // ✅ کنترل‌های جدول (گوشه جدول)
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
      const wrap = scrollRef.current;
      if (!wrap) return;

      const tableEl = editor.isActive("table") ? findClosestTableEl() : null;
      if (!tableEl) {
        setTableUi((p) => (p.open ? { ...p, open: false } : p));
        return;
      }

      const wrapRect = wrap.getBoundingClientRect();
      const tRect = tableEl.getBoundingClientRect();

      const CONTROL_W = 300;
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

  // ✅ کلیک روی هر جای صفحه => فوکوس + آوردن کرسر همانجا
  const focusAtClick = (e) => {
    if (!editor) return;

    // اگر روی دکمه/سلکت کلیک شد مزاحم نشو
    const t = e.target;
    if (t?.closest?.("button,select,option,input,textarea,a,[role='button']")) return;

    // مهم: نذاریم اسکرول/selection خراب شود
    e.preventDefault();

    editor.commands.focus();

    // اگر مختصات داخل view بود، کرسر همانجا
    const coords = { left: e.clientX, top: e.clientY };
    const pos = editor.view.posAtCoords(coords);

    if (pos?.pos != null) {
      const tr = editor.state.tr.setSelection(TextSelection.create(editor.state.doc, pos.pos));
      editor.view.dispatch(tr);
      editor.view.focus();
      return;
    }

    // در غیر این صورت برو انتهای متن
    editor.commands.focus("end");
  };

  const currentFont = editor?.getAttributes("textStyle")?.fontFamily || FONTS[0].value;
  const currentSize = editor?.getAttributes("textStyle")?.fontSize || "14px";

  const insertTable3x3 = () => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();

  const tableAddRow = () => editor?.chain().focus().addRowAfter().run();
  const tableDelRow = () => editor?.chain().focus().deleteRow().run();
  const tableAddCol = () => editor?.chain().focus().addColumnAfter().run();
  const tableDelCol = () => editor?.chain().focus().deleteColumn().run();

  const rowHInc = () => editor?.chain().focus().incRowHeight().run();
  const rowHDec = () => editor?.chain().focus().decRowHeight().run();
  const rowHReset = () => editor?.chain().focus().resetRowHeight().run();

  const alignRight = () => editor?.chain().focus().setTextAlign("right").run();
  const alignCenter = () => editor?.chain().focus().setTextAlign("center").run();
  const alignLeft = () => editor?.chain().focus().setTextAlign("left").run();
  const alignJustify = () => editor?.chain().focus().setTextAlign("justify").run();

  return (
    <div className="p-4 md:p-6">
      {/* ✅ ستون‌ها (Excel-like) */}
      <style>{`
        .ProseMirror table { position: relative; }
        .ProseMirror .column-resize-handle{
          position:absolute; top:-2px; right:-2px; bottom:-2px; width:6px;
          background: rgba(0,0,0,0.10);
          pointer-events:none;
          opacity:0;
          transition: opacity .12s ease;
        }
        .ProseMirror table:hover .column-resize-handle { opacity: 1; }
        .ProseMirror.resize-cursor { cursor: col-resize; }
        .dark .ProseMirror .column-resize-handle { background: rgba(255,255,255,0.14); }
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
            ref={scrollRef}
            className={[
              "relative",
              "mx-auto w-full max-w-[560px]",
              "max-h-[700px] overflow-auto rounded-2xl",
              "border border-black/10 dark:border-neutral-800",
              "bg-white dark:bg-neutral-950",
            ].join(" ")}
          >
            {/* ✅ لایه‌ی صفحات: پس‌زمینه A4 پشت سر هم */}
            <div
              ref={pagesRef}
              onMouseDown={focusAtClick}
              className="relative w-full"
              style={{
                // اگر pageH محاسبه شد، پس‌زمینه را دقیق تکرار کن
                backgroundImage: `url(${TEMPLATE_URL})`,
                backgroundRepeat: "repeat-y",
                backgroundPosition: "center top",
                backgroundSize: pageH ? `100% ${pageH}px` : "100% 100%",
                minHeight: pageH ? `${pageH}px` : "700px",
              }}
            >
              {/* ✅ لوگو داخل A4 (روی هر صفحه) */}
              {pageH > 0 &&
                Array.from({ length: pageCount }).map((_, i) => (
                  <img
                    key={i}
                    src={LOGO_URL}
                    alt="لوگو"
                    className="pointer-events-none select-none absolute object-contain"
                    style={{
                      top: i * pageH + 18,
                      left: "50%",
                      transform: "translateX(-50%)",
                      height: 56,
                      opacity: 1,
                    }}
                  />
                ))}

              {/* ✅ ناحیه‌ی تایپ: با padding ثابت برای سربرگ/پاورقی */}
              <div
                className="relative"
                style={{
                  paddingTop: 110,
                  paddingBottom: 70,
                  paddingLeft: 56,
                  paddingRight: 56,
                }}
              >
                {/* ✅ کنترل مینیمال جدول */}
                {tableUi.open && (
                  <div
                    className={[
                      "absolute z-20",
                      "rounded-xl border border-black/10 bg-white/90 backdrop-blur px-2 py-2 shadow-sm",
                      "dark:bg-neutral-950/85 dark:border-neutral-800",
                    ].join(" ")}
                    style={{ left: tableUi.left, top: tableUi.top }}
                    onMouseDown={(e) => e.preventDefault()}
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

                      {/* ✅ ارتفاع همان ردیف (نه همه) */}
                      <div className="flex items-center gap-1">
                        <MiniPMBtn disabled={!editor} onClick={rowHInc} title="ارتفاع ردیف +">
                          ↕+
                        </MiniPMBtn>
                        <MiniPMBtn disabled={!editor} onClick={rowHDec} title="ارتفاع ردیف −">
                          ↕−
                        </MiniPMBtn>
                        <MiniPMBtn disabled={!editor} onClick={rowHReset} title="ریست ارتفاع">
                          ↺
                        </MiniPMBtn>
                      </div>
                    </div>
                  </div>
                )}

                {/* ✅ خود ادیتور */}
                <div
                  ref={pmRef}
                  className={[
                    "ProseMirror",
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
                  onMouseDown={(e) => {
                    // وقتی دقیقاً روی فضای خالی کلیک شد
                    // posAtCoords معمولاً کار می‌کند، ولی این کمک اضافه است
                    if (e.target === pmRef.current) focusAtClick(e);
                  }}
                >
                  <EditorContent editor={editor} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            <PrimaryBtn disabled={!editor} onClick={() => setPreviewOpen(true)}>
              پیش‌نمایش
            </PrimaryBtn>
          </div>
        </div>
      </Card>

      {/* Preview Modal */}
      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)}>
        <div className="mx-auto w-full max-w-[560px]">
          <div
            className="rounded-2xl border border-black/10 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden"
            style={{
              backgroundImage: `url(${TEMPLATE_URL})`,
              backgroundRepeat: "repeat-y",
              backgroundPosition: "center top",
              backgroundSize: pageH ? `100% ${pageH}px` : "100% 100%",
              minHeight: pageH ? `${Math.max(pageH, pageCount * pageH)}px` : "900px",
            }}
          >
            {/* لوگو روی صفحات */}
            {pageH > 0 &&
              Array.from({ length: pageCount }).map((_, i) => (
                <img
                  key={i}
                  src={LOGO_URL}
                  alt="لوگو"
                  className="pointer-events-none select-none absolute object-contain"
                  style={{
                    top: i * pageH + 18,
                    left: "50%",
                    transform: "translateX(-50%)",
                    height: 56,
                  }}
                />
              ))}

            <div style={{ paddingTop: 110, paddingBottom: 70, paddingLeft: 56, paddingRight: 56 }}>
              <div style={{ fontFamily: "Vazirmatn, sans-serif" }} dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
