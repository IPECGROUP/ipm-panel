// src/pages/LettersPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Card from "../components/ui/Card.jsx";

const TABS = [
  { id: "incoming", label: "وارده" },
  { id: "outgoing", label: "صادره" },
];

const CATEGORY_OPTIONS = [
  { id: "general", label: "عمومی" },
  { id: "projects", label: "پروژه" },
  { id: "internal", label: "داخلی" },
  { id: "external", label: "خارجی" },
];

function toFaDigits(input) {
  const s = String(input ?? "");
  const map = { 0: "۰", 1: "۱", 2: "۲", 3: "۳", 4: "۴", 5: "۵", 6: "۶", 7: "۷", 8: "۸", 9: "۹" };
  return s.replace(/\d/g, (d) => map[d] || d);
}

function normalizeTags(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((t) => {
        if (typeof t === "string") return { id: t, name: t };
        if (t && typeof t === "object") {
          const id = t.id ?? t._id ?? t.value ?? t.name ?? t.label;
          const name = t.name ?? t.label ?? t.title ?? t.value ?? String(id ?? "");
          return { id: String(id ?? name), name: String(name ?? "") };
        }
        return null;
      })
      .filter(Boolean);
  }
  // object map
  if (typeof raw === "object") {
    return Object.entries(raw).map(([k, v]) => ({ id: String(k), name: String(v) }));
  }
  return [];
}

export default function LettersPage() {
  const API_BASE = useMemo(() => (window.API_URL || "/api").replace(/\/+$/, ""), []);
  const [activeTab, setActiveTab] = useState("incoming");

  // list + refs
  const [loading, setLoading] = useState(false);
  const [letters, setLetters] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tags, setTags] = useState([]);

  // filter
  const [filterQ, setFilterQ] = useState("");
  const [filterCategory, setFilterCategory] = useState("general");
  const [filterProjectId, setFilterProjectId] = useState("");
  const [filterTagIds, setFilterTagIds] = useState([]);

  // form modal
  const [openForm, setOpenForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // upload modal
  const [openUpload, setOpenUpload] = useState(false);
  const fileInputRef = useRef(null);

  const emptyForm = useMemo(
    () => ({
      tab: activeTab, // incoming/outgoing
      category: "general",
      projectId: "",
      letterNo: "",
      letterDate: "",
      fromName: "",
      toName: "",
      orgName: "",
      subject: "",
      hasAttachment: false,
      attachmentTitle: "",
      secretariatDate: "",
      secretariatNo: "",
      receiverName: "",
      tagIds: [],
      piroIds: [],
      returnToIds: [],
      attachments: [],
      notes: "",
    }),
    [activeTab]
  );

  const [form, setForm] = useState(emptyForm);

  async function api(path, opt = {}) {
    const res = await fetch(API_BASE + path, {
      credentials: "include",
      ...opt,
      headers: {
        ...(opt.headers || {}),
      },
    });
    const txt = await res.text();
    let data = {};
    try {
      data = txt ? JSON.parse(txt) : {};
    } catch (_e) {
      data = { raw: txt };
    }
    if (!res.ok) {
      const msg = data?.error || data?.message || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [lettersRes, projectsRes, tagsRes] = await Promise.allSettled([
        api("/letters"),
        api("/projects"),
        api("/tags"),
      ]);

      if (lettersRes.status === "fulfilled") {
        const items = lettersRes.value?.items || lettersRes.value?.data || lettersRes.value || [];
        setLetters(Array.isArray(items) ? items : []);
      } else {
        setLetters([]);
      }

      if (projectsRes.status === "fulfilled") {
        const items = projectsRes.value?.items || projectsRes.value?.data || projectsRes.value || [];
        setProjects(Array.isArray(items) ? items : []);
      } else {
        setProjects([]);
      }

      if (tagsRes.status === "fulfilled") {
        const items = tagsRes.value?.items || tagsRes.value?.data || tagsRes.value || [];
        setTags(normalizeTags(items));
      } else {
        setTags([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // recent tags (capsules)
  const recentTags = useMemo(() => {
    const map = new Map();
    const push = (t, score) => {
      if (!t?.id) return;
      const key = String(t.id);
      const prev = map.get(key);
      const next = { id: String(t.id), name: String(t.name ?? t.label ?? t.title ?? t.id), score };
      if (!prev || next.score > prev.score) map.set(key, next);
    };

    // from API tags first
    (tags || []).forEach((t, idx) => push(t, 1000 - idx));

    // then from letters usage (more recent usage higher)
    const list = Array.isArray(letters) ? letters : [];
    for (let i = list.length - 1, rank = 0; i >= 0; i--, rank++) {
      const l = list[i];
      const lt = normalizeTags(l?.tags || l?.tagIds || l?.tag_ids);
      lt.forEach((t) => push(t, 2000 - rank));
    }

    return Array.from(map.values())
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 16)
      .map(({ id, name }) => ({ id, name }));
  }, [letters, tags]);

  function toggleChip(listSetter, list, id) {
    const sid = String(id);
    if (list.includes(sid)) listSetter(list.filter((x) => x !== sid));
    else listSetter([...list, sid]);
  }

  function resetFormForNew() {
    setEditingId(null);
    setForm({ ...emptyForm, tab: activeTab });
    setOpenForm(true);
  }

  function openEdit(letter) {
    const l = letter || {};
    setEditingId(l.id ?? l._id ?? null);
    setForm({
      tab: l.tab || l.kind || l.type || activeTab,
      category: l.category || l.category_id || "general",
      projectId: String(l.projectId ?? l.project_id ?? l.project?.id ?? ""),
      letterNo: l.letterNo ?? l.letter_no ?? "",
      letterDate: l.letterDate ?? l.letter_date ?? "",
      fromName: l.fromName ?? l.from_name ?? "",
      toName: l.toName ?? l.to_name ?? "",
      orgName: l.orgName ?? l.org_name ?? "",
      subject: l.subject ?? "",
      hasAttachment: !!(l.hasAttachment ?? l.has_attachment),
      attachmentTitle: l.attachmentTitle ?? l.attachment_title ?? "",
      secretariatDate: l.secretariatDate ?? l.secretariat_date ?? "",
      secretariatNo: l.secretariatNo ?? l.secretariat_no ?? "",
      receiverName: l.receiverName ?? l.receiver_name ?? "",
      tagIds: normalizeTags(l.tags || l.tagIds || l.tag_ids).map((t) => String(t.id)),
      piroIds: Array.isArray(l.piroIds ?? l.piro_ids) ? (l.piroIds ?? l.piro_ids) : [],
      returnToIds: Array.isArray(l.returnToIds ?? l.return_to_ids) ? (l.returnToIds ?? l.return_to_ids) : [],
      attachments: Array.isArray(l.attachments) ? l.attachments : [],
      notes: l.notes ?? "",
    });
    setOpenForm(true);
  }

  async function saveLetter() {
    setSaving(true);
    try {
      const payload = {
        tab: form.tab,
        category: form.category,
        project_id: form.category === "projects" ? (form.projectId ? Number(form.projectId) : null) : null,
        letter_no: form.letterNo,
        letter_date: form.letterDate,
        from_name: form.fromName,
        to_name: form.toName,
        org_name: form.orgName,
        subject: form.subject,
        has_attachment: !!form.hasAttachment,
        attachment_title: form.attachmentTitle,
        secretariat_date: form.secretariatDate,
        secretariat_no: form.secretariatNo,
        receiver_name: form.receiverName,
        tag_ids: (form.tagIds || []).map(String),
        piro_ids: form.piroIds || [],
        return_to_ids: form.returnToIds || [],
        attachments: form.attachments || [],
        notes: form.notes || "",
      };

      if (editingId) {
        await api(`/letters/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await api(`/letters`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      setOpenForm(false);
      setEditingId(null);
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function removeLetter(id) {
    const ok = window.confirm("حذف شود؟");
    if (!ok) return;
    try {
      await api(`/letters/${id}`, { method: "DELETE" });
      await loadAll();
    } catch (e) {
      alert(e.message || "خطا در حذف");
    }
  }

  // Upload (always allowed — no dependency on hasAttachment)
  async function uploadFiles(files) {
    const list = Array.from(files || []);
    if (!list.length) return;

    for (const file of list) {
      try {
        const fd = new FormData();
        fd.append("file", file);

        const up = await api(`/uploads/letters`, {
          method: "POST",
          body: fd,
        });

        const att = {
          url: up?.url || up?.path || up?.file?.url || up?.fileUrl || "",
          name: up?.name || up?.file?.name || file.name,
          size: up?.size || up?.file?.size || file.size,
          type: up?.type || up?.file?.type || file.type,
        };

        setForm((p) => ({ ...p, attachments: [...(p.attachments || []), att] }));
      } catch (e) {
        alert(e.message || "آپلود ناموفق");
      }
    }
  }

  function removeAttachment(idx) {
    setForm((p) => {
      const arr = [...(p.attachments || [])];
      arr.splice(idx, 1);
      return { ...p, attachments: arr };
    });
  }

  const filteredLetters = useMemo(() => {
    const q = (filterQ || "").trim().toLowerCase();
    const mustTags = (filterTagIds || []).map(String);

    return (letters || [])
      .filter((l) => {
        const tab = l.tab || l.kind || l.type;
        return String(tab || "").toLowerCase() === String(activeTab).toLowerCase();
      })
      .filter((l) => {
        const cat = l.category || l.category_id || "general";
        if (filterCategory && String(cat) !== String(filterCategory)) return false;

        // project filter ONLY when category === projects
        if (String(filterCategory) === "projects") {
          const pid = String(l.projectId ?? l.project_id ?? l.project?.id ?? "");
          if (filterProjectId && pid !== String(filterProjectId)) return false;
        }
        return true;
      })
      .filter((l) => {
        if (!mustTags.length) return true;
        const lt = normalizeTags(l.tags || l.tagIds || l.tag_ids).map((t) => String(t.id));
        return mustTags.every((t) => lt.includes(String(t)));
      })
      .filter((l) => {
        if (!q) return true;
        const hay = [
          l.subject,
          l.letterNo ?? l.letter_no,
          l.orgName ?? l.org_name,
          l.fromName ?? l.from_name,
          l.toName ?? l.to_name,
          l.receiverName ?? l.receiver_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
  }, [letters, activeTab, filterQ, filterCategory, filterProjectId, filterTagIds]);

  return (
    <div className="rtl p-3 md:p-4 space-y-3">
      <Card className="rounded-2xl border border-black/10 bg-white text-black dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
        {/* Top actions row: Back + Add grouped together (NOT next to upload) */}
        <div className="p-4 flex items-center justify-between gap-3">
          {/* Right side (RTL): Back + Add */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="h-10 px-4 rounded-xl border border-black/15 bg-white text-black hover:bg-black/5 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 dark:hover:bg-white/10"
            >
              بازگشت
            </button>
            <button
              type="button"
              onClick={resetFormForNew}
              className="h-10 px-4 rounded-xl bg-black text-white hover:bg-black/90 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white/90"
            >
              افزودن
            </button>
          </div>

          {/* Left side: Upload */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpenUpload(true)}
              className="h-10 px-4 rounded-xl border border-black/15 bg-white text-black hover:bg-black/5 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 dark:hover:bg-white/10 flex items-center gap-2"
            >
              <img
                src="/images/icons/afzodan.svg"
                alt=""
                className="w-5 h-5"
                draggable="false"
              />
              آپلود و الصاق فایل‌ها
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2">
            {TABS.map((t) => {
              const active = t.id === activeTab;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(t.id);
                    setForm((p) => ({ ...p, tab: t.id }));
                  }}
                  className={
                    "h-10 px-4 rounded-xl border transition " +
                    (active
                      ? "bg-black text-white border-black dark:bg-neutral-100 dark:text-neutral-900 dark:border-neutral-100"
                      : "bg-white text-black border-black/15 hover:bg-black/5 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 dark:hover:bg-white/10")
                  }
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card className="rounded-2xl border border-black/10 bg-white text-black dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
        <div className="p-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm mb-1 text-black/70 dark:text-neutral-300">جستجو</label>
              <input
                value={filterQ}
                onChange={(e) => setFilterQ(e.target.value)}
                placeholder="موضوع / شماره / سازمان / فرستنده / گیرنده ..."
                className="w-full h-11 px-3 rounded-xl border border-black/15 bg-white text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-black/10 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:placeholder:text-neutral-400 dark:focus:ring-white/10"
              />
            </div>

            <div className="w-full lg:w-56">
              <label className="block text-sm mb-1 text-black/70 dark:text-neutral-300">دسته‌بندی</label>
              <select
                value={filterCategory}
                onChange={(e) => {
                  const v = e.target.value;
                  setFilterCategory(v);
                  if (v !== "projects") setFilterProjectId("");
                }}
                className="w-full h-11 px-3 rounded-xl border border-black/15 bg-white text-black focus:outline-none focus:ring-2 focus:ring-black/10 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-white/10"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Project filter ONLY when category === projects */}
            {String(filterCategory) === "projects" && (
              <div className="w-full lg:w-72">
                <label className="block text-sm mb-1 text-black/70 dark:text-neutral-300">پروژه</label>
                <select
                  value={filterProjectId}
                  onChange={(e) => setFilterProjectId(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-black/15 bg-white text-black focus:outline-none focus:ring-2 focus:ring-black/10 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-white/10"
                >
                  <option value="">همه</option>
                  {projects.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.code ? `${p.code} - ${p.name}` : p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Tag chips (NOT dropdown) */}
          <div className="space-y-2">
            <div className="text-sm text-black/70 dark:text-neutral-300">برچسب‌ها</div>
            <div className="flex flex-wrap gap-2">
              {recentTags.length ? (
                recentTags.map((t) => {
                  const selected = (filterTagIds || []).includes(String(t.id));
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleChip(setFilterTagIds, filterTagIds, t.id)}
                      className={
                        "px-3 py-1.5 rounded-full border text-sm transition " +
                        (selected
                          ? "bg-black text-white border-black dark:bg-neutral-100 dark:text-neutral-900 dark:border-neutral-100"
                          : "bg-white text-black border-black/15 hover:bg-black/5 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 dark:hover:bg-white/10")
                      }
                      title={t.name}
                    >
                      {t.name}
                    </button>
                  );
                })
              ) : (
                <div className="text-sm text-black/50 dark:text-neutral-400">برچسبی وجود ندارد.</div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* List */}
      <Card className="rounded-2xl border border-black/10 bg-white text-black dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 overflow-hidden">
        <div className="px-[15px] pb-4">
          <div className="rounded-2xl border border-black/10 overflow-hidden bg-white text-black dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
            <table className="w-full text-sm [&_th]:text-center [&_td]:text-center [&_th]:py-0.5 [&_td]:py-0.5">
              <thead className="bg-neutral-200 text-black border-b border-neutral-300 dark:bg-white/10 dark:text-neutral-100 dark:border-neutral-700">
                <tr>
                  <th className="!py-2 !text-[14px] md:!text-[15px] !font-semibold w-28">شماره</th>
                  <th className="!py-2 !text-[14px] md:!text-[15px] !font-semibold">موضوع</th>
                  <th className="!py-2 !text-[14px] md:!text-[15px] !font-semibold w-32">تاریخ</th>
                  <th className="!py-2 !text-[14px] md:!text-[15px] !font-semibold w-40">سازمان</th>
                  <th className="!py-2 !text-[14px] md:!text-[15px] !font-semibold w-40">گیرنده</th>
                  <th className="!py-2 !text-[14px] md:!text-[15px] !font-semibold w-40">اقدامات</th>
                </tr>
              </thead>
              <tbody className="[&_td]:text-black dark:[&_td]:text-neutral-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-black/60 dark:text-neutral-400">
                      در حال بارگذاری...
                    </td>
                  </tr>
                ) : filteredLetters.length ? (
                  filteredLetters.map((l, idx) => {
                    const id = l.id ?? l._id ?? idx;
                    const no = l.letterNo ?? l.letter_no ?? "";
                    const date = l.letterDate ?? l.letter_date ?? "";
                    const org = l.orgName ?? l.org_name ?? "";
                    const recv = l.receiverName ?? l.receiver_name ?? "";
                    const subject = l.subject ?? "";
                    return (
                      <tr
                        key={id}
                        className={
                          (idx % 2 === 0
                            ? "bg-white dark:bg-neutral-900"
                            : "bg-neutral-50 dark:bg-neutral-800/50") +
                          " border-b border-neutral-300 dark:border-neutral-700"
                        }
                      >
                        <td className="py-2">{toFaDigits(no)}</td>
                        <td className="py-2 px-2 text-right">{subject}</td>
                        <td className="py-2">{toFaDigits(date)}</td>
                        <td className="py-2">{org}</td>
                        <td className="py-2">{recv}</td>
                        <td className="py-2">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(l)}
                              className="h-9 w-9 rounded-xl !bg-transparent !ring-0 !border-0 !shadow-none hover:opacity-80 flex items-center justify-center"
                              title="ویرایش"
                            >
                              <img src="/images/icons/pencil.svg" alt="" className="w-[18px] h-[18px]" draggable="false" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeLetter(l.id ?? l._id)}
                              className="h-9 w-9 rounded-xl !bg-transparent !ring-0 !border-0 !shadow-none hover:opacity-80 flex items-center justify-center"
                              title="حذف"
                            >
                              <img
                                src="/images/icons/hazf.svg"
                                alt=""
                                className="w-[19px] h-[19px]"
                                style={{ filter: "invert(20%) sepia(90%) saturate(5000%) hue-rotate(340deg) brightness(95%) contrast(95%)" }}
                                draggable="false"
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-black/60 dark:text-neutral-400">
                      موردی یافت نشد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Form Modal */}
      {openForm &&
        createPortal(
          <div className="fixed inset-0 z-[80] bg-black/40 p-3 flex items-center justify-center">
            <div className="w-full max-w-4xl rounded-2xl border border-black/10 bg-white text-black dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div className="text-base font-semibold">{editingId ? "ویرایش نامه" : "افزودن نامه"}</div>
                <button
                  type="button"
                  onClick={() => setOpenForm(false)}
                  className="h-10 w-10 rounded-xl ring-1 ring-black/15 hover:bg-black/5 dark:ring-neutral-800 dark:hover:bg-white/10 flex items-center justify-center"
                  title="بستن"
                >
                  <img src="/images/icons/bastan.svg" alt="" className="w-5 h-5 invert dark:invert-0" draggable="false" />
                </button>
              </div>

              <div className="p-4 pt-0 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm mb-1 text-black/70 dark:text-neutral-300">دسته‌بندی</label>
                    <select
                      value={form.category}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm((p) => ({ ...p, category: v, projectId: v === "projects" ? p.projectId : "" }));
                      }}
                      className="w-full h-11 px-3 rounded-xl border border-black/15 bg-white text-black focus:outline-none focus:ring-2 focus:ring-black/10 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-white/10"
                    >
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Project field ONLY when category === projects */}
                  {String(form.category) === "projects" && (
                    <div>
                      <label className="block text-sm mb-1 text-black/70 dark:text-neutral-300">پروژه</label>
                      <select
                        value={form.projectId}
                        onChange={(e) => setForm((p) => ({ ...p, projectId: e.target.value }))}
                        className="w-full h-11 px-3 rounded-xl border border-black/15 bg-white text-black focus:outline-none focus:ring-2 focus:ring-black/10 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-white/10"
                      >
                        <option value="">انتخاب...</option>
                        {projects.map((p) => (
                          <option key={p.id} value={String(p.id)}>
                            {p.code ? `${p.code} - ${p.name}` : p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm mb-1 text-black/70 dark:text-neutral-300">شماره نامه</label>
                    <input
                      value={form.letterNo}
                      onChange={(e) => setForm((p) => ({ ...p, letterNo: e.target.value }))}
                      className="w-full h-11 px-3 rounded-xl border border-black/15 bg-white text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-black/10 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:placeholder:text-neutral-400 dark:focus:ring-white/10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-1 text-black/70 dark:text-neutral-300">تاریخ نامه</label>
                    <input
                      value={form.letterDate}
                      onChange={(e) => setForm((p) => ({ ...p, letterDate: e.target.value }))}
                      placeholder="مثال: ۱۴۰۴/۰۹/۰۱"
                      className="w-full h-11 px-3 rounded-xl border border-black/15 bg-white text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-black/10 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:placeholder:text-neutral-400 dark:focus:ring-white/10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-1 text-black/70 dark:text-neutral-300">فرستنده</label>
                    <input
                      value={form.fromName}
                      onChange={(e) => setForm((p) => ({ ...p, fromName: e.target.value }))}
                      className="w-full h-11 px-3 rounded-xl border border-black/15 bg-white text-black focus:outline-none focus:ring-2 focus:ring-black/10 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-white/10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-1 text-black/70 dark:text-neutral-300">گیرنده</label>
                    <input
                      value={form.toName}
                      onChange={(e) => setForm((p) => ({ ...p, toName: e.target.value }))}
                      className="w-full h-11 px-3 rounded-xl border border-black/15 bg-white text-black focus:outline-none focus:ring-2 focus:ring-black/10 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-white/10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-1 text-black/70 dark:text-neutral-300">سازمان</label>
                    <input
                      value={form.orgName}
                      onChange={(e) => setForm((p) => ({ ...p, orgName: e.target.value }))}
                      className="w-full h-11 px-3 rounded-xl border border-black/15 bg-white text-black focus:outline-none focus:ring-2 focus:ring-black/10 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-white/10"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm mb-1 text-black/70 dark:text-neutral-300">موضوع</label>
                    <input
                      value={form.subject}
                      onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                      className="w-full h-11 px-3 rounded-xl border border-black/15 bg-white text-black focus:outline-none focus:ring-2 focus:ring-black/10 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-white/10"
                    />
                  </div>
                </div>

                {/* Attach fields ALWAYS available (no dependency on hasAttachment) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  <div className="md:col-span-2">
                    <label className="block text-sm mb-1 text-black/70 dark:text-neutral-300">عنوان ضمیمه</label>
                    <input
                      value={form.attachmentTitle}
                      onChange={(e) => setForm((p) => ({ ...p, attachmentTitle: e.target.value }))}
                      className="w-full h-11 px-3 rounded-xl border border-black/15 bg-white text-black focus:outline-none focus:ring-2 focus:ring-black/10 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-white/10"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => setOpenUpload(true)}
                      className="w-full h-11 rounded-xl border border-black/15 bg-white text-black hover:bg-black/5 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 dark:hover:bg-white/10 flex items-center justify-center gap-2"
                    >
                      <img src="/images/icons/afzodan.svg" alt="" className="w-5 h-5" draggable="false" />
                      آپلود فایل
                    </button>
                  </div>

                  {!!(form.attachments || []).length && (
                    <div className="md:col-span-3">
                      <div className="text-sm text-black/70 dark:text-neutral-300 mb-2">فایل‌های الصاق‌شده</div>
                      <div className="space-y-2">
                        {(form.attachments || []).map((a, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 dark:bg-neutral-800 dark:border-neutral-700"
                          >
                            <div className="min-w-0">
                              <div className="text-sm truncate">{a?.name || a?.url || "فایل"}</div>
                              <div className="text-xs text-black/50 dark:text-neutral-400">
                                {a?.size ? `${toFaDigits(Math.round(a.size / 1024))} KB` : ""}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAttachment(idx)}
                              className="h-9 w-9 rounded-xl !bg-transparent !ring-0 !border-0 !shadow-none hover:opacity-80 flex items-center justify-center"
                              title="حذف فایل"
                            >
                              <img
                                src="/images/icons/hazf.svg"
                                alt=""
                                className="w-[19px] h-[19px]"
                                style={{ filter: "invert(20%) sepia(90%) saturate(5000%) hue-rotate(340deg) brightness(95%) contrast(95%)" }}
                                draggable="false"
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Tag chips (NOT dropdown) for letter itself */}
                <div className="space-y-2 pt-1">
                  <div className="text-sm text-black/70 dark:text-neutral-300">برچسب‌ها</div>
                  <div className="flex flex-wrap gap-2">
                    {recentTags.length ? (
                      recentTags.map((t) => {
                        const selected = (form.tagIds || []).includes(String(t.id));
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() =>
                              setForm((p) => ({
                                ...p,
                                tagIds: selected ? (p.tagIds || []).filter((x) => x !== String(t.id)) : [...(p.tagIds || []), String(t.id)],
                              }))
                            }
                            className={
                              "px-3 py-1.5 rounded-full border text-sm transition " +
                              (selected
                                ? "bg-black text-white border-black dark:bg-neutral-100 dark:text-neutral-900 dark:border-neutral-100"
                                : "bg-white text-black border-black/15 hover:bg-black/5 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 dark:hover:bg-white/10")
                            }
                            title={t.name}
                          >
                            {t.name}
                          </button>
                        );
                      })
                    ) : (
                      <div className="text-sm text-black/50 dark:text-neutral-400">برچسبی وجود ندارد.</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setOpenForm(false)}
                    className="h-11 px-4 rounded-xl border border-black/15 bg-white text-black hover:bg-black/5 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 dark:hover:bg-white/10"
                  >
                    انصراف
                  </button>
                  <button
                    type="button"
                    onClick={saveLetter}
                    disabled={saving}
                    className={
                      "h-11 px-5 rounded-xl bg-black text-white hover:bg-black/90 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white/90 " +
                      (saving ? "opacity-60 cursor-not-allowed" : "")
                    }
                  >
                    {saving ? "در حال ذخیره..." : "ذخیره"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Upload Modal */}
      {openUpload &&
        createPortal(
          <div className="fixed inset-0 z-[90] bg-black/40 p-3 flex items-center justify-center">
            <div className="w-full max-w-lg rounded-2xl border border-black/10 bg-white text-black dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div className="text-base font-semibold">آپلود و الصاق فایل‌ها</div>
                <button
                  type="button"
                  onClick={() => setOpenUpload(false)}
                  className="h-10 w-10 rounded-xl ring-1 ring-black/15 hover:bg-black/5 dark:ring-neutral-800 dark:hover:bg-white/10 flex items-center justify-center"
                  title="بستن"
                >
                  <img src="/images/icons/bastan.svg" alt="" className="w-5 h-5 invert dark:invert-0" draggable="false" />
                </button>
              </div>

              <div className="p-4 pt-0 space-y-3">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-2xl border border-dashed border-black/20 bg-white hover:bg-black/5 dark:bg-neutral-900 dark:hover:bg-white/10 dark:border-neutral-700 p-5 cursor-pointer text-center"
                >
                  <div className="text-sm text-black/70 dark:text-neutral-300">برای انتخاب فایل کلیک کنید</div>
                  <div className="text-xs text-black/50 dark:text-neutral-400 mt-1">می‌توانید چند فایل انتخاب کنید</div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length) uploadFiles(files);
                    e.target.value = "";
                  }}
                />

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenUpload(false)}
                    className="h-11 px-4 rounded-xl border border-black/15 bg-white text-black hover:bg-black/5 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 dark:hover:bg-white/10"
                  >
                    بستن
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
