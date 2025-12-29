// src/pages/TestEditorPage.jsx
import React, { useMemo, useState } from "react";
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

function IconBtn({ active, disabled, onClick, children, title }) {
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

  const [previewHtml, setPreviewHtml] = useState("");

  const editor = useEditor({
    extensions: [
      // ✅ برای اینکه bullet/ordered درست کار کنن، listها رو از StarterKit فعال نگه می‌داریم
      // و تنظیماتش رو واضح می‌کنیم. (تو RTL معمولاً مشکلی از CSS/dir میاد؛ اینجا dir=rtl داریم)
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
    content: `
      <p><strong>دمو ادیتور</strong></p>
      <p>این صفحه فقط برای تست است. می‌توانید لیست‌ها، جدول و قالب‌بندی را امتحان کنید.</p>
      <p>• برای تست، چند خط بنویسید و سپس Bullet/Ordered List را بزنید.</p>
    `,
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
    onUpdate: ({ editor }) => setPreviewHtml(editor.getHTML()),
  });

  const currentFont = editor?.getAttributes("textStyle")?.fontFamily || FONTS[0].value;
  const currentSize = editor?.getAttributes("textStyle")?.fontSize || "14px";

  const insertTable3x3 = () => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const saveTest = () => {
    if (!editor) return;
    const html = editor.getHTML();
    const json = editor.getJSON();
    console.log("LETTER_HTML:", html);
    console.log("LETTER_JSON:", json);
    alert("ذخیره تستی انجام شد (خروجی داخل console.log).");
  };

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
              <div className="hidden md:block">
                <div className="text-sm font-semibold text-black dark:text-neutral-100">دمو ادیتور</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  فقط برای تست UI (بدون ذخیره واقعی)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <PrimaryBtn onClick={saveTest} disabled={!editor}>
                ذخیره تستی
              </PrimaryBtn>
            </div>
          </div>
        </div>

        {/* Top Controls (حذف قالب + حذف افزودن بلوک) */}
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

          {/* اگر دوست داشتی میشه اینجا alignment هم اضافه کرد، ولی گفتی تغییر اضافه ندم */}
        </div>

        {/* Editor */}
        <div
          className={[
            // جدول‌ها
            "[&_table]:w-full [&_table]:border-collapse [&_table]:my-3",
            "[&_td]:border [&_th]:border [&_td]:border-black/20 [&_th]:border-black/20",
            "dark:[&_td]:border-neutral-700 dark:[&_th]:border-neutral-700",
            "[&_th]:bg-black/5 dark:[&_th]:bg-white/10",
            "[&_td]:p-2 [&_th]:p-2",

            // ✅ لیست‌ها: کمک می‌کنه نمایش bullet/ordered تو RTL درست و واضح باشه
            "[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pr-6 [&_.ProseMirror_ul]:my-2",
            "[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pr-6 [&_.ProseMirror_ol]:my-2",
            "[&_.ProseMirror_li]:my-1",
          ].join(" ")}
          style={{ fontFamily: "Vazirmatn, sans-serif" }}
        >
          <EditorContent editor={editor} />
        </div>
      </Card>

      {/* Preview (برای خودت تو تست) */}
      <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4 dark:bg-neutral-950 dark:border-neutral-800">
        <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">پیش‌نمایش خروجی (HTML)</div>
        <div className="prose max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: previewHtml }} />
      </div>
    </div>
  );
}
