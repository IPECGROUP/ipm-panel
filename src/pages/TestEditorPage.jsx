// src/pages/TestEditorPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Card from "../components/ui/Card.jsx";
import { useEditor, EditorContent } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle, FontFamily } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";

const STORAGE_KEY = "test_editor_docs_local_v3";
const WORD_MIME = "application/msword";
const PAGE_VERSION = "Local-Only v4";

const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el) => el.style.fontSize || null,
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
    };
  },
});

function readDocs() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDocs(items) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(items) ? items : []));
  } catch {}
}

function newId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function safeFileName(v) {
  return String(v || "document")
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "document";
}

function buildWordHtmlDocument(contentHtml, title) {
  const cleanTitle = safeFileName(title || "document");
  const body = String(contentHtml || "");
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>${cleanTitle}</title>
</head>
<body dir="rtl" style="font-family: Vazirmatn, Tahoma, Arial, sans-serif;">
${body}
</body>
</html>`;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function Btn({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={[
        "h-10 px-3 rounded-xl border border-black/10 bg-white hover:bg-black/5 text-sm",
        "disabled:opacity-40 disabled:hover:bg-white",
        "dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 dark:hover:bg-white/10",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

function PrimaryBtn({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={[
        "h-10 px-4 rounded-xl bg-black text-white hover:bg-black/90 text-sm",
        "disabled:opacity-40",
        "dark:bg-white dark:text-black dark:hover:bg-white/90",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

function IconBtn({ title, active, onClick, disabled, children }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={[
        "h-10 w-10 rounded-xl border border-black/10 bg-white hover:bg-black/5",
        "dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 dark:hover:bg-white/10",
        "disabled:opacity-40",
        active ? "ring-2 ring-black/30 dark:ring-white/20" : "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function TestEditorPage() {
  const [docs, setDocs] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [title, setTitle] = useState("New document");
  const [status, setStatus] = useState("");
  const [dirty, setDirty] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const selectedDoc = useMemo(
    () => docs.find((d) => String(d?.id || "") === String(selectedId || "")) || null,
    [docs, selectedId]
  );

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
      Placeholder.configure({ placeholder: "Start typing here..." }),
    ],
    content: "<p></p>",
    editorProps: {
      attributes: {
        dir: "rtl",
        class: "outline-none text-[14px] leading-7 text-black dark:text-neutral-100 min-h-[420px]",
      },
    },
    onUpdate: () => setDirty(true),
  });

  useEffect(() => {
    const items = readDocs().sort((a, b) => String(b?.updatedAt || "").localeCompare(String(a?.updatedAt || "")));
    setDocs(items);
    if (items.length) {
      setSelectedId(String(items[0].id));
      setTitle(String(items[0].title || "New document"));
    }
    setStatus("Local-only mode active. No server/database write.");
  }, []);

  useEffect(() => {
    if (!editor) return;
    if (!selectedDoc) {
      editor.commands.setContent("<p></p>", false);
      setTitle("New document");
      setDirty(false);
      return;
    }
    setTitle(String(selectedDoc.title || "New document"));
    editor.commands.setContent(String(selectedDoc.html || "<p></p>"), false);
    setDirty(false);
  }, [editor, selectedDoc]);

  const saveCurrent = useCallback(() => {
    if (!editor) return;
    const currentId = String(selectedId || newId());
    const cleanTitle = String(title || "").trim() || "Untitled";

    const nextDoc = {
      id: currentId,
      title: cleanTitle,
      html: editor.getHTML(),
      updatedAt: new Date().toISOString(),
    };

    const filtered = (Array.isArray(docs) ? docs : []).filter((x) => String(x?.id || "") !== currentId);
    const next = [nextDoc, ...filtered].sort((a, b) => String(b?.updatedAt || "").localeCompare(String(a?.updatedAt || "")));

    writeDocs(next);
    setDocs(next);
    setSelectedId(currentId);
    setDirty(false);
    setStatus("Saved locally in browser only.");
  }, [docs, editor, selectedId, title]);

  const createNewDoc = useCallback(() => {
    if (!editor) return;
    const id = newId();
    const doc = {
      id,
      title: "New document",
      html: "<p></p>",
      updatedAt: new Date().toISOString(),
    };
    const next = [doc, ...(Array.isArray(docs) ? docs : [])];
    writeDocs(next);
    setDocs(next);
    setSelectedId(id);
    setTitle(doc.title);
    editor.commands.setContent(doc.html, false);
    setDirty(false);
    setStatus("New local document created.");
  }, [docs, editor]);

  const deleteCurrent = useCallback(() => {
    if (!selectedId) return;
    const ok = window.confirm("Delete this local document?");
    if (!ok) return;

    const next = (Array.isArray(docs) ? docs : []).filter((x) => String(x?.id || "") !== String(selectedId));
    writeDocs(next);
    setDocs(next);

    if (!next.length) {
      setSelectedId("");
      setTitle("New document");
      editor?.commands.setContent("<p></p>", false);
      setDirty(false);
      setStatus("Document deleted.");
      return;
    }

    setSelectedId(String(next[0].id));
    setStatus("Document deleted.");
  }, [docs, editor, selectedId]);

  const clearAllLocalDocs = useCallback(() => {
    const ok = window.confirm("Delete ALL local documents from this browser?");
    if (!ok) return;
    writeDocs([]);
    setDocs([]);
    setSelectedId("");
    setTitle("New document");
    editor?.commands.setContent("<p></p>", false);
    setDirty(false);
    setStatus("All local documents deleted. No server/database action.");
  }, [editor]);

  const downloadWord = useCallback(() => {
    if (!editor) return;
    const cleanTitle = String(title || "").trim() || "document";
    const content = buildWordHtmlDocument(editor.getHTML(), cleanTitle);
    const blob = new Blob(["\uFEFF", content], { type: WORD_MIME });
    downloadBlob(blob, `${safeFileName(cleanTitle)}.doc`);
    setStatus("Word file downloaded. Open it in Microsoft Word Desktop.");
  }, [editor, title]);

  const applyTitleOnly = useCallback(() => {
    if (!selectedDoc) return;
    const cleanTitle = String(title || "").trim() || "Untitled";
    const next = docs.map((x) =>
      String(x?.id || "") === String(selectedDoc.id)
        ? { ...x, title: cleanTitle, updatedAt: new Date().toISOString() }
        : x
    );
    writeDocs(next);
    setDocs(next);
    setStatus("Title updated locally.");
  }, [docs, selectedDoc, title]);

  const currentFont = editor?.getAttributes("textStyle")?.fontFamily || "Vazirmatn, sans-serif";
  const currentSize = editor?.getAttributes("textStyle")?.fontSize || "14px";

  return (
    <div className="p-4 md:p-6">
      <Card className="rounded-2xl border border-black/10 bg-white overflow-hidden dark:bg-neutral-950 dark:border-neutral-800">
        <div className="p-3 md:p-4 border-b border-black/10 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
          <div className="text-base font-semibold">Editor (Local Only)</div>
          <div className="text-xs text-neutral-500 mt-1">No API calls. No database writes. Everything stays in browser localStorage.</div>
          <div className="text-[11px] text-neutral-400 mt-1">{PAGE_VERSION}</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] min-h-[76vh]">
          <div className="border-b lg:border-b-0 lg:border-l border-black/10 dark:border-neutral-800 p-3 space-y-3 bg-neutral-50/70 dark:bg-neutral-900/50">
            <div className="space-y-2">
              <div className="text-sm font-semibold">Documents</div>
              <div className="max-h-[320px] overflow-auto rounded-xl border border-black/10 dark:border-neutral-800 bg-white dark:bg-neutral-950">
                {!docs.length ? (
                  <div className="p-3 text-xs text-neutral-500">No local docs.</div>
                ) : (
                  docs.map((d) => {
                    const active = String(d?.id || "") === String(selectedId || "");
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setSelectedId(String(d.id || ""))}
                        className={[
                          "w-full text-right px-3 py-2 text-sm border-b border-black/5 dark:border-neutral-800",
                          active ? "bg-black/10 dark:bg-white/10 font-semibold" : "hover:bg-black/[0.03] dark:hover:bg-white/[0.06]",
                        ].join(" ")}
                      >
                        <div className="truncate">{d.title || "Untitled"}</div>
                        <div className="text-[11px] text-neutral-500">{d.updatedAt || "-"}</div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="space-y-2">
              <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" />
              <div className="flex flex-wrap gap-2">
                <PrimaryBtn onClick={createNewDoc}>New</PrimaryBtn>
                <Btn onClick={saveCurrent} disabled={!editor}>Save</Btn>
                <Btn onClick={applyTitleOnly} disabled={!selectedDoc}>Rename</Btn>
                <Btn onClick={deleteCurrent} disabled={!selectedDoc} className="text-red-600 dark:text-red-400">Delete</Btn>
                <Btn onClick={clearAllLocalDocs} className="text-red-600 dark:text-red-400">Delete All Local</Btn>
                <Btn onClick={downloadWord} disabled={!editor}>Download Word</Btn>
                <Btn onClick={() => setPreviewOpen(true)} disabled={!editor}>Preview</Btn>
              </div>
            </div>

            <div className="text-xs border-t border-black/10 dark:border-neutral-800 pt-2 space-y-1">
              <div>Doc ID: <span className="font-mono">{selectedId || "-"}</span></div>
              <div>Storage Key: <span className="font-mono">{STORAGE_KEY}</span></div>
              <div>Status: {dirty ? "Unsaved changes" : "Saved state"}</div>
              <div className="text-neutral-600 dark:text-neutral-300">{status}</div>
            </div>
          </div>

          <div className="p-3 md:p-4 bg-white dark:bg-neutral-950">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <select
                className="h-10 rounded-xl border border-black/10 bg-white px-3 text-black dark:bg-neutral-950 dark:text-neutral-100 dark:border-neutral-800"
                value={currentFont}
                onChange={(e) => editor?.chain().focus().setFontFamily(e.target.value).run()}
              >
                <option value="Vazirmatn, sans-serif">Vazirmatn</option>
                <option value="Tahoma, sans-serif">Tahoma</option>
                <option value="Arial, sans-serif">Arial</option>
              </select>
              <select
                className="h-10 rounded-xl border border-black/10 bg-white px-3 text-black dark:bg-neutral-950 dark:text-neutral-100 dark:border-neutral-800"
                value={currentSize}
                onChange={(e) => editor?.chain().focus().setFontSize(e.target.value).run()}
              >
                {["12px", "14px", "16px", "18px", "20px", "24px"].map((s) => (
                  <option key={s} value={s}>{s.replace("px", "")}</option>
                ))}
              </select>

              <div className="h-6 w-px bg-black/10 dark:bg-white/10 mx-1" />

              <IconBtn title="Bold" active={editor?.isActive("bold")} disabled={!editor} onClick={() => editor?.chain().focus().toggleBold().run()}>B</IconBtn>
              <IconBtn title="Italic" active={editor?.isActive("italic")} disabled={!editor} onClick={() => editor?.chain().focus().toggleItalic().run()}>I</IconBtn>
              <IconBtn title="Underline" active={editor?.isActive("underline")} disabled={!editor} onClick={() => editor?.chain().focus().toggleUnderline().run()}>U</IconBtn>

              <div className="h-6 w-px bg-black/10 dark:bg-white/10 mx-1" />

              <IconBtn title="Bullet list" active={editor?.isActive("bulletList")} disabled={!editor} onClick={() => editor?.chain().focus().toggleBulletList().run()}>*</IconBtn>
              <IconBtn title="Ordered list" active={editor?.isActive("orderedList")} disabled={!editor} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>1.</IconBtn>
            </div>

            <div
              className={[
                "rounded-2xl border border-black/10 bg-white dark:bg-neutral-950 dark:border-neutral-800 p-4",
                "[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pr-6 [&_.ProseMirror_ul]:my-2",
                "[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pr-6 [&_.ProseMirror_ol]:my-2",
              ].join(" ")}
              style={{ fontFamily: "Vazirmatn, sans-serif" }}
            >
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
      </Card>

      {previewOpen && (
        <div className="fixed inset-0 z-[1000]">
          <div className="absolute inset-0 bg-black/40" onMouseDown={() => setPreviewOpen(false)} role="presentation" />
          <div className="absolute inset-0 p-4 md:p-8 overflow-auto">
            <div className="mx-auto w-full max-w-[980px] rounded-2xl border border-black/10 bg-white text-black shadow-xl dark:bg-neutral-950 dark:text-neutral-100 dark:border-neutral-800">
              <div className="p-3 md:p-4 border-b border-black/10 dark:border-neutral-800 flex items-center justify-between">
                <div className="text-sm font-semibold">Preview</div>
                <Btn onClick={() => setPreviewOpen(false)}>Close</Btn>
              </div>
              <div className="p-4 md:p-6 bg-neutral-50 dark:bg-neutral-900">
                <div className="rounded-2xl border border-black/10 bg-white dark:bg-neutral-950 dark:border-neutral-800 p-6">
                  <div style={{ fontFamily: "Vazirmatn, sans-serif" }} dangerouslySetInnerHTML={{ __html: editor?.getHTML() || "" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TextInput(props) {
  return (
    <input
      className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-black dark:bg-neutral-950 dark:text-neutral-100 dark:border-neutral-800"
      {...props}
    />
  );
}
