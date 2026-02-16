import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Card from "../components/ui/Card.jsx";
import { api } from "../utils/api.js";

const DEFAULT_DOC_SERVER_URL = String(import.meta.env.VITE_ONLYOFFICE_URL || "http://localhost:8082").replace(/\/+$/, "");
const DOCS_API_SCRIPT = "/web-apps/apps/api/documents/api.js";

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

function TextInput(props) {
  return (
    <input
      className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-black dark:bg-neutral-950 dark:text-neutral-100 dark:border-neutral-800"
      {...props}
    />
  );
}

export default function TestEditorPage() {
  const [docs, setDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [selectedId, setSelectedId] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [renameTitle, setRenameTitle] = useState("");

  const [busyCreate, setBusyCreate] = useState(false);
  const [busyRename, setBusyRename] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);

  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [docServerUrl, setDocServerUrl] = useState(DEFAULT_DOC_SERVER_URL);
  const [docsApiReady, setDocsApiReady] = useState(false);
  const [docsApiError, setDocsApiError] = useState("");
  const [loadingEditor, setLoadingEditor] = useState(false);

  const editorId = useMemo(() => `onlyoffice_editor_${Math.random().toString(16).slice(2)}`, []);
  const editorRef = useRef(null);

  const selectedDoc = useMemo(
    () => docs.find((d) => String(d?.id || "") === String(selectedId || "")) || null,
    [docs, selectedId]
  );

  const destroyEditor = useCallback(() => {
    try {
      if (editorRef.current && typeof editorRef.current.destroyEditor === "function") {
        editorRef.current.destroyEditor();
      }
    } catch {}
    editorRef.current = null;
  }, []);

  const loadDocs = useCallback(async () => {
    setLoadingDocs(true);
    setErrorMsg("");
    try {
      const res = await api("/word-docs", { method: "GET" });
      const items = Array.isArray(res?.items) ? res.items : [];
      setDocs(items);

      if (!items.length) {
        setSelectedId("");
        setRenameTitle("");
        destroyEditor();
      } else if (!items.some((x) => String(x?.id || "") === String(selectedId || ""))) {
        const first = items[0];
        setSelectedId(String(first?.id || ""));
        setRenameTitle(String(first?.title || ""));
      }
    } catch (e) {
      setErrorMsg(`Failed to load docs: ${e?.message || "request_failed"}`);
    } finally {
      setLoadingDocs(false);
    }
  }, [destroyEditor, selectedId]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  useEffect(() => {
    if (!selectedDoc) {
      setRenameTitle("");
      return;
    }
    setRenameTitle(String(selectedDoc?.title || ""));
  }, [selectedDoc]);

  useEffect(() => {
    setDocsApiReady(false);
    setDocsApiError("");

    if (!docServerUrl) {
      setDocsApiError("ONLYOFFICE server URL is empty.");
      return;
    }

    if (window.DocsAPI) {
      setDocsApiReady(true);
      return;
    }

    const src = `${docServerUrl}${DOCS_API_SCRIPT}`;
    const existing = document.querySelector(`script[data-onlyoffice-src="${src}"]`);
    if (existing) {
      const t = setInterval(() => {
        if (window.DocsAPI) {
          clearInterval(t);
          setDocsApiReady(true);
        }
      }, 120);
      return () => clearInterval(t);
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.onlyofficeSrc = src;
    script.onload = () => setDocsApiReady(true);
    script.onerror = () => setDocsApiError(`Cannot load ONLYOFFICE script from ${src}`);
    document.body.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, [docServerUrl]);

  useEffect(() => {
    let cancelled = false;

    async function mountEditor() {
      if (!selectedId) return;
      setLoadingEditor(true);
      setErrorMsg("");

      try {
        const res = await api(`/word-docs/editor-config/${selectedId}`, { method: "GET" });
        const nextDocServerUrl = String(res?.documentServerUrl || "").replace(/\/+$/, "");
        if (nextDocServerUrl && nextDocServerUrl !== docServerUrl) {
          setDocServerUrl(nextDocServerUrl);
          return;
        }

        if (!docsApiReady || !window.DocsAPI) return;

        const config = res?.config;
        if (!config || typeof config !== "object") {
          throw new Error("invalid_editor_config");
        }

        destroyEditor();

        const host = document.getElementById(editorId);
        if (host) host.innerHTML = "";

        if (!cancelled) {
          editorRef.current = new window.DocsAPI.DocEditor(editorId, config);
          setStatusMsg("Word editor is ready.");
        }
      } catch (e) {
        if (!cancelled) {
          setErrorMsg(`Failed to open editor: ${e?.message || "request_failed"}`);
        }
      } finally {
        if (!cancelled) setLoadingEditor(false);
      }
    }

    mountEditor();
    return () => {
      cancelled = true;
    };
  }, [destroyEditor, docServerUrl, docsApiReady, editorId, selectedId]);

  useEffect(() => {
    return () => destroyEditor();
  }, [destroyEditor]);

  const onCreate = useCallback(async () => {
    setBusyCreate(true);
    setErrorMsg("");
    setStatusMsg("");
    try {
      const title = String(newTitle || "").trim() || "New document";
      const res = await api("/word-docs", {
        method: "POST",
        body: JSON.stringify({ title }),
      });
      const id = String(res?.item?.id || "");
      setNewTitle("");
      await loadDocs();
      if (id) setSelectedId(id);
      setStatusMsg("Document created.");
    } catch (e) {
      setErrorMsg(`Create failed: ${e?.message || "request_failed"}`);
    } finally {
      setBusyCreate(false);
    }
  }, [loadDocs, newTitle]);

  const onRename = useCallback(async () => {
    if (!selectedId) return;
    setBusyRename(true);
    setErrorMsg("");
    setStatusMsg("");
    try {
      const title = String(renameTitle || "").trim();
      if (!title) throw new Error("title_required");
      await api(`/word-docs/${selectedId}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      });
      await loadDocs();
      setStatusMsg("Title updated.");
    } catch (e) {
      setErrorMsg(`Rename failed: ${e?.message || "request_failed"}`);
    } finally {
      setBusyRename(false);
    }
  }, [loadDocs, renameTitle, selectedId]);

  const onDelete = useCallback(async () => {
    if (!selectedId) return;
    const ok = window.confirm("Delete this document?");
    if (!ok) return;

    setBusyDelete(true);
    setErrorMsg("");
    setStatusMsg("");
    try {
      await api(`/word-docs/${selectedId}`, { method: "DELETE" });
      await loadDocs();
      setStatusMsg("Document deleted.");
    } catch (e) {
      setErrorMsg(`Delete failed: ${e?.message || "request_failed"}`);
    } finally {
      setBusyDelete(false);
    }
  }, [loadDocs, selectedId]);

  return (
    <div className="p-4 md:p-6">
      <Card className="rounded-2xl border border-black/10 bg-white overflow-hidden dark:bg-neutral-950 dark:border-neutral-800">
        <div className="p-3 md:p-4 border-b border-black/10 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
          <div className="text-base font-semibold">ONLYOFFICE Word Editor</div>
          <div className="text-xs text-neutral-500 mt-1">
            True in-browser Word-style editing with server-side save callback.
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] min-h-[74vh]">
          <div className="border-b lg:border-b-0 lg:border-l border-black/10 dark:border-neutral-800 p-3 space-y-3 bg-neutral-50/70 dark:bg-neutral-900/50">
            <div className="space-y-2">
              <div className="text-sm font-semibold">Create Document</div>
              <TextInput
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="New document title"
              />
              <PrimaryBtn onClick={onCreate} disabled={busyCreate}>
                {busyCreate ? "Creating..." : "Create"}
              </PrimaryBtn>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold">Documents</div>
              <div className="max-h-[240px] overflow-auto rounded-xl border border-black/10 dark:border-neutral-800 bg-white dark:bg-neutral-950">
                {loadingDocs ? (
                  <div className="p-3 text-xs text-neutral-500">Loading...</div>
                ) : docs.length ? (
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
                ) : (
                  <div className="p-3 text-xs text-neutral-500">No documents yet.</div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold">Selected Document</div>
              <TextInput
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
                placeholder="Rename title"
                disabled={!selectedId}
              />
              <div className="flex gap-2">
                <Btn onClick={onRename} disabled={!selectedId || busyRename}>
                  {busyRename ? "Saving..." : "Rename"}
                </Btn>
                <Btn onClick={onDelete} disabled={!selectedId || busyDelete} className="text-red-600 dark:text-red-400">
                  {busyDelete ? "Deleting..." : "Delete"}
                </Btn>
              </div>
            </div>

            <div className="pt-2 border-t border-black/10 dark:border-neutral-800 text-xs space-y-1">
              <div><span className="font-semibold">DocServer:</span> {docServerUrl || "-"}</div>
              <div><span className="font-semibold">Docs API:</span> {docsApiReady ? "Loaded" : "Not loaded"}</div>
              {docsApiError ? <div className="text-red-600 dark:text-red-400">{docsApiError}</div> : null}
            </div>
          </div>

          <div className="p-3 md:p-4 bg-white dark:bg-neutral-950">
            {errorMsg ? (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                {errorMsg}
              </div>
            ) : null}
            {statusMsg ? (
              <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-2 text-sm dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300">
                {statusMsg}
              </div>
            ) : null}

            {!selectedId ? (
              <div className="h-[70vh] rounded-2xl border border-dashed border-black/15 dark:border-neutral-700 grid place-items-center text-sm text-neutral-500">
                Create or select a document to start editing.
              </div>
            ) : (
              <div className="h-[70vh] rounded-2xl overflow-hidden border border-black/10 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 relative">
                {loadingEditor ? (
                  <div className="absolute inset-0 grid place-items-center text-sm text-neutral-500 z-10 bg-white/70 dark:bg-neutral-950/70">
                    Loading Word editor...
                  </div>
                ) : null}
                <div id={editorId} className="h-full w-full" />
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
