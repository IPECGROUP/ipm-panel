    // src/pages/TestEditorPage.jsx
import React, { useMemo, useState } from "react";
import Card from "../components/ui/Card.jsx";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import FontSize from "@tiptap/extension-font-size";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Placeholder from "@tiptap/extension-placeholder";

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
  // فونت‌های مجاز (همونایی که تو می‌خوای)
  const FONTS = useMemo(
    () => [
      { label: "Vazirmatn", value: "Vazirmatn, sans-serif" },
      { label: "Tahoma", value: "Tahoma, sans-serif" },
      { label: "Arial", value: "Arial, sans-serif" },
    ],
    []
  );

  const SIZES = useMemo(() => ["12px", "14px", "16px", "18px", "20px", "24px"], []);

  // --- قالب‌ها (Template) ---
  // همه چیز داخل ادیتور قابل ادیت هست: کاربر می‌تونه حذف/تغییر بده
  const TEMPLATES = useMemo(() => {
    const header = `
      <div style="border:1px solid rgba(0,0,0,.12); border-radius:16px; padding:12px; margin-bottom:12px;">
        <div style="display:flex; gap:12px; justify-content:space-between; flex-wrap:wrap;">
          <div><strong>شماره:</strong> <span>……</span></div>
          <div><strong>تاریخ:</strong> <span>……</span></div>
          <div><strong>پیوست:</strong> <span>دارد / ندارد</span></div>
        </div>
        <div style="display:flex; gap:12px; justify-content:space-between; flex-wrap:wrap; margin-top:8px;">
          <div><strong>از:</strong> <span>……</span></div>
          <div><strong>به:</strong> <span>……</span></div>
        </div>
        <div style="margin-top:8px;"><strong>موضوع:</strong> <span>……</span></div>
      </div>
    `;

    const body = `
      <p><strong>با سلام و احترام،</strong></p>
      <p>متن نامه را اینجا بنویسید…</p>
      <p>با تشکر</p>
      <p>نام و نام‌خانوادگی / سمت</p>
    `;

    const withTable = `
      ${header}
      <p><strong>با سلام و احترام،</strong></p>
      <p>متن نامه را اینجا بنویسید…</p>
      <p><strong>جدول موارد:</strong></p>
      <table>
        <tr>
          <th>ردیف</th><th>شرح</th><th>تعداد</th><th>مبلغ</th>
        </tr>
        <tr>
          <td>1</td><td>…</td><td>…</td><td>…</td>
        </tr>
      </table>
      <p style="margin-top:12px;">با تشکر</p>
      <p>نام و نام‌خانوادگی / سمت</p>
    `;

    const internalMemo = `
      ${header}
      <p><strong>یادداشت داخلی</strong></p>
      <p>• نکته ۱: …</p>
      <p>• نکته ۲: …</p>
      <p style="margin-top:12px;"><strong>اقدام مورد نیاز:</strong> …</p>
      <p style="margin-top:12px;">نام / واحد</p>
    `;

    return [
      { id: "official", label: "قالب نامه اداری", html: `${header}${body}` },
      { id: "official_table", label: "نامه اداری + جدول", html: withTable },
      { id: "memo", label: "یادداشت داخلی", html: internalMemo },
    ];
  }, []);

  const BLOCKS = useMemo(() => {
    const signature = `
      <p style="margin-top:16px;"><strong>با احترام</strong></p>
      <p>نام و نام‌خانوادگی</p>
      <p>سمت</p>
    `;

    const copyTo = `
      <div style="margin-top:12px; border:1px dashed rgba(0,0,0,.18); border-radius:14px; padding:10px;">
        <p style="margin:0;"><strong>رونوشت:</strong></p>
        <p style="margin:0;">- …</p>
        <p style="margin:0;">- …</p>
      </div>
    `;

    const attachments = `
      <div style="margin-top:12px; border:1px dashed rgba(0,0,0,.18); border-radius:14px; padding:10px;">
        <p style="margin:0;"><strong>پیوست‌ها:</strong></p>
        <p style="margin:0;">1) …</p>
        <p style="margin:0;">2) …</p>
      </div>
    `;

    const paragraphReady = `
      <p><strong>بدینوسیله به استحضار می‌رساند</strong> …</p>
    `;

    return [
      { id: "signature", label: "بلوک امضا", html: signature },
      { id: "copy", label: "بلوک رونوشت", html: copyTo },
      { id: "attach", label: "بلوک پیوست‌ها", html: attachments },
      { id: "para", label: "جمله آماده", html: paragraphReady },
    ];
  }, []);

  const [tplId, setTplId] = useState("official");
  const [blockId, setBlockId] = useState("signature");
  const [previewHtml, setPreviewHtml] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      Placeholder.configure({ placeholder: "اینجا شروع به نوشتن کنید…" }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: TEMPLATES.find((t) => t.id === "official")?.html || "",
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

  const insertHtmlBlock = (html) => {
    if (!editor) return;
    editor.chain().focus().insertContent(html).run();
  };

  const applyTemplate = () => {
    if (!editor) return;
    const tpl = TEMPLATES.find((t) => t.id === tplId);
    editor.chain().focus().setContent(tpl?.html || "").run();
  };

  const insertTable3x3 = () => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
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
        {/* Top Controls */}
        <div className="p-4 border-b border-black/10 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <select
                className="h-10 rounded-xl border border-black/10 bg-white px-3 text-black dark:bg-neutral-950 dark:text-neutral-100 dark:border-neutral-800"
                value={tplId}
                onChange={(e) => setTplId(e.target.value)}
              >
                {TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>

              <PrimaryBtn onClick={applyTemplate} disabled={!editor}>
                اعمال قالب
              </PrimaryBtn>
            </div>

            <div className="h-6 w-px bg-black/10 dark:bg-white/10 mx-1" />

            <div className="flex items-center gap-2">
              <select
                className="h-10 rounded-xl border border-black/10 bg-white px-3 text-black dark:bg-neutral-950 dark:text-neutral-100 dark:border-neutral-800"
                value={blockId}
                onChange={(e) => setBlockId(e.target.value)}
              >
                {BLOCKS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>

              <SmallBtn
                onClick={() => {
                  const b = BLOCKS.find((x) => x.id === blockId);
                  insertHtmlBlock(b?.html || "");
                }}
                disabled={!editor}
              >
                افزودن بلوک
              </SmallBtn>

              <SmallBtn onClick={insertTable3x3} disabled={!editor}>
                افزودن جدول
              </SmallBtn>
            </div>

            <div className="flex-1" />

            <PrimaryBtn onClick={saveTest} disabled={!editor}>
              ذخیره تستی
            </PrimaryBtn>
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

          <SmallBtn disabled={!editor} onClick={() => editor?.chain().focus().undo().run()}>
            Undo
          </SmallBtn>
          <SmallBtn disabled={!editor} onClick={() => editor?.chain().focus().redo().run()}>
            Redo
          </SmallBtn>
        </div>

        {/* Editor */}
        <div
          className={[
            // جدول‌ها داخل ادیتور
            "[&_table]:w-full [&_table]:border-collapse [&_table]:my-3",
            "[&_td]:border [&_th]:border [&_td]:border-black/20 [&_th]:border-black/20",
            "dark:[&_td]:border-neutral-700 dark:[&_th]:border-neutral-700",
            "[&_th]:bg-black/5 dark:[&_th]:bg-white/10",
            "[&_td]:p-2 [&_th]:p-2",
          ].join(" ")}
          style={{ fontFamily: "Vazirmatn, sans-serif" }}
        >
          <EditorContent editor={editor} />
        </div>
      </Card>

      {/* Preview (برای خودت تو تست) */}
      <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4 dark:bg-neutral-950 dark:border-neutral-800">
        <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
          پیش‌نمایش خروجی (HTML)
        </div>
        <div className="prose max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: previewHtml }} />
      </div>
    </div>
  );
}
