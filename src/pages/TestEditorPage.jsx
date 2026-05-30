import React, { useCallback, useEffect, useMemo, useState } from "react";
import Card from "../components/ui/Card.jsx";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";

const DRAFT_KEY = "test_editor_word_like_draft_v1";

const DEFAULT_DOC = `
  <h1>سند آزمایشی</h1>
  <p>این صفحه برای تست است و هیچ ذخیره‌ای در دیتابیس انجام نمی‌شود.</p>
  <p>می‌توانید متن، جدول، تیتر، لیست و فرمت‌ها را مثل Word تغییر دهید.</p>
  <ul>
    <li>Bold / Italic / Underline</li>
    <li>هدینگ، لیست و نقل‌قول</li>
    <li>جدول و ویرایش سطر/ستون</li>
  </ul>
`;

function ToolbarButton({ label, onClick, active = false, disabled = false, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title || label}
      className={
        "h-9 px-3 rounded-lg border text-sm transition disabled:opacity-45 disabled:cursor-not-allowed " +
        (active
          ? "bg-black text-white border-black"
          : "bg-white text-neutral-800 border-black/15 hover:bg-black/[0.03]")
      }
    >
      {label}
    </button>
  );
}

function ToolbarDivider() {
  return <span className="h-8 w-px bg-black/10 mx-1 hidden md:inline-block" aria-hidden="true" />;
}

function readDraft() {
  try {
    return localStorage.getItem(DRAFT_KEY) || "";
  } catch {
    return "";
  }
}

export default function TestEditorPage() {
  const initialContent = useMemo(() => {
    const cached = readDraft();
    return cached || DEFAULT_DOC;
  }, []);

  const [htmlPreview, setHtmlPreview] = useState("");
  const [message, setMessage] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Placeholder.configure({
        placeholder: "اینجا تایپ کنید...",
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "focus:outline-none",
      },
    },
    onUpdate: ({ editor: ed }) => {
      setHtmlPreview(ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    setHtmlPreview(editor.getHTML());
  }, [editor]);

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(""), 1800);
    return () => window.clearTimeout(t);
  }, [message]);

  const setHeading = useCallback(
    (value) => {
      if (!editor) return;
      const chain = editor.chain().focus();
      if (value === "p") {
        chain.setParagraph().run();
        return;
      }
      chain.toggleHeading({ level: Number(value) }).run();
    },
    [editor],
  );

  const headingValue = useMemo(() => {
    if (!editor) return "p";
    if (editor.isActive("heading", { level: 1 })) return "1";
    if (editor.isActive("heading", { level: 2 })) return "2";
    if (editor.isActive("heading", { level: 3 })) return "3";
    return "p";
  }, [editor, htmlPreview]);

  const saveDraft = useCallback(() => {
    if (!editor) return;
    try {
      localStorage.setItem(DRAFT_KEY, editor.getHTML());
      setMessage("پیش‌نویس فقط در مرورگر ذخیره شد (بدون دیتابیس).");
    } catch {
      setMessage("ذخیره محلی ناموفق بود.");
    }
  }, [editor]);

  const restoreDraft = useCallback(() => {
    if (!editor) return;
    const cached = readDraft();
    if (!cached) {
      setMessage("پیش‌نویس محلی پیدا نشد.");
      return;
    }
    editor.commands.setContent(cached);
    setMessage("پیش‌نویس محلی بارگذاری شد.");
  }, [editor]);

  const clearEditor = useCallback(() => {
    if (!editor) return;
    editor.commands.clearContent();
    setMessage("محتوا پاک شد.");
  }, [editor]);

  const downloadHtml = useCallback(() => {
    if (!editor) return;
    const html = editor.getHTML();
    const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "test-editor-document.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [editor]);

  const copyHtml = useCallback(async () => {
    if (!editor) return;
    try {
      await navigator.clipboard.writeText(editor.getHTML());
      setMessage("HTML در کلیپ‌بورد کپی شد.");
    } catch {
      setMessage("کپی در کلیپ‌بورد انجام نشد.");
    }
  }, [editor]);

  return (
    <div className="space-y-4">
      <Card className="p-0 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-black/10 bg-neutral-50">
          <h1 className="text-lg md:text-xl font-semibold">Test Editor (Word-Like)</h1>
          <p className="text-sm text-neutral-600 mt-1">
            این صفحه کاملا تستی است. هیچ درخواست API ارسال نمی‌شود و هیچ داده‌ای در دیتابیس ذخیره نمی‌شود.
          </p>
        </div>

        <div className="test-editor-no-print px-3 md:px-4 py-3 border-b border-black/10 bg-white">
          <div className="flex flex-wrap items-center gap-2">
            <ToolbarButton
              label="Undo"
              onClick={() => editor?.chain().focus().undo().run()}
              disabled={!editor?.can().chain().focus().undo().run()}
            />
            <ToolbarButton
              label="Redo"
              onClick={() => editor?.chain().focus().redo().run()}
              disabled={!editor?.can().chain().focus().redo().run()}
            />

            <ToolbarDivider />

            <ToolbarButton
              label="B"
              title="Bold"
              active={!!editor?.isActive("bold")}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            />
            <ToolbarButton
              label="I"
              title="Italic"
              active={!!editor?.isActive("italic")}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            />
            <ToolbarButton
              label="U"
              title="Underline"
              active={!!editor?.isActive("underline")}
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
            />
            <ToolbarButton
              label="S"
              title="Strike"
              active={!!editor?.isActive("strike")}
              onClick={() => editor?.chain().focus().toggleStrike().run()}
            />

            <ToolbarDivider />

            <label className="sr-only" htmlFor="heading-level">
              Heading level
            </label>
            <select
              id="heading-level"
              value={headingValue}
              onChange={(e) => setHeading(e.target.value)}
              className="h-9 px-3 rounded-lg border border-black/15 bg-white text-sm"
            >
              <option value="p">پاراگراف</option>
              <option value="1">تیتر 1</option>
              <option value="2">تیتر 2</option>
              <option value="3">تیتر 3</option>
            </select>

            <ToolbarButton
              label="• لیست"
              active={!!editor?.isActive("bulletList")}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            />
            <ToolbarButton
              label="1. لیست"
              active={!!editor?.isActive("orderedList")}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            />
            <ToolbarButton
              label="نقل‌قول"
              active={!!editor?.isActive("blockquote")}
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            />

            <ToolbarDivider />

            <ToolbarButton
              label="جدول"
              onClick={() =>
                editor
                  ?.chain()
                  .focus()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run()
              }
            />
            <ToolbarButton
              label="سطر+"
              onClick={() => editor?.chain().focus().addRowAfter().run()}
              disabled={!editor?.isActive("table")}
            />
            <ToolbarButton
              label="ستون+"
              onClick={() => editor?.chain().focus().addColumnAfter().run()}
              disabled={!editor?.isActive("table")}
            />
            <ToolbarButton
              label="حذف جدول"
              onClick={() => editor?.chain().focus().deleteTable().run()}
              disabled={!editor?.isActive("table")}
            />

            <ToolbarDivider />

            <ToolbarButton label="پرینت" onClick={() => window.print()} />
            <ToolbarButton label="دانلود HTML" onClick={downloadHtml} />
            <ToolbarButton label="کپی HTML" onClick={copyHtml} />
            <ToolbarButton label="ذخیره محلی" onClick={saveDraft} />
            <ToolbarButton label="بارگذاری محلی" onClick={restoreDraft} />
            <ToolbarButton label="پاک‌کردن" onClick={clearEditor} />
          </div>

          <div className="mt-2 min-h-6 text-xs text-neutral-600">{message || " "}</div>
        </div>

        <div className="bg-neutral-200/80 p-3 md:p-6">
          <div className="test-editor-paper mx-auto w-full max-w-[850px] rounded-lg border border-black/10 bg-white shadow-[0_14px_50px_rgba(0,0,0,0.18)] overflow-hidden">
            <EditorContent editor={editor} />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-sm md:text-base font-semibold mb-2">HTML خروجی (تستی)</h2>
        <div className="max-h-64 overflow-auto rounded-xl border border-black/10 bg-neutral-50 p-3">
          <pre className="text-xs leading-6 whitespace-pre-wrap break-words text-neutral-700">
            {htmlPreview}
          </pre>
        </div>
      </Card>

      <style>{`
        .test-editor-paper .ProseMirror {
          min-height: 1120px;
          padding: 54px 52px;
          line-height: 1.9;
          font-size: 15px;
          color: #171717;
          direction: rtl;
          text-align: right;
          font-family: Vazir, system-ui, -apple-system, "Segoe UI", sans-serif;
          background: #fff;
        }

        .test-editor-paper .ProseMirror p {
          margin: 0 0 0.9rem;
        }

        .test-editor-paper .ProseMirror h1,
        .test-editor-paper .ProseMirror h2,
        .test-editor-paper .ProseMirror h3 {
          line-height: 1.35;
          margin: 1.2rem 0 0.7rem;
          font-weight: 700;
        }

        .test-editor-paper .ProseMirror h1 {
          font-size: 1.8rem;
        }

        .test-editor-paper .ProseMirror h2 {
          font-size: 1.35rem;
        }

        .test-editor-paper .ProseMirror h3 {
          font-size: 1.15rem;
        }

        .test-editor-paper .ProseMirror ul,
        .test-editor-paper .ProseMirror ol {
          margin: 0 0 1rem;
          padding-right: 1.25rem;
        }

        .test-editor-paper .ProseMirror blockquote {
          border-right: 3px solid #e5e7eb;
          margin: 1rem 0;
          padding: 0.3rem 0.9rem;
          color: #525252;
          background: #fafafa;
        }

        .test-editor-paper .ProseMirror table {
          border-collapse: collapse;
          width: 100%;
          margin: 1rem 0;
          table-layout: fixed;
        }

        .test-editor-paper .ProseMirror table td,
        .test-editor-paper .ProseMirror table th {
          border: 1px solid #d4d4d4;
          padding: 0.45rem 0.55rem;
          vertical-align: top;
          position: relative;
        }

        .test-editor-paper .ProseMirror table th {
          background: #f5f5f5;
          font-weight: 600;
        }

        .test-editor-paper .ProseMirror table .selectedCell::after {
          content: "";
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.08);
          pointer-events: none;
        }

        .test-editor-paper .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          float: right;
          pointer-events: none;
          height: 0;
        }

        @media (max-width: 768px) {
          .test-editor-paper .ProseMirror {
            min-height: 760px;
            padding: 24px 18px;
            font-size: 14px;
          }
        }

        @media print {
          .test-editor-no-print {
            display: none !important;
          }
          .test-editor-paper {
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
