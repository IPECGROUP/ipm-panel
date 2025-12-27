// src/pages/LettersPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Card from "../components/ui/Card.jsx";

const TABS = [
  { id: "all", label: "همه" },
  { id: "incoming", label: "وارده", icon: "/images/icons/varede.svg" },
  { id: "outgoing", label: "صادره", icon: "/images/icons/sadere.svg" },
  { id: "internal", label: "داخلی", icon: "/images/icons/dakheli.svg" },
];

const QUICK_CHIPS = [
  ["week", "هفته قبل"],
  ["2w", "2 هفته قبل"],
  ["1m", "ماه قبل"],
  ["3m", "3 ماه قبل"],
  ["6m", "6 ماه قبل"],
];

const PERSIAN_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

function toEnDigits(s) {
  return String(s || "")
    .replace(/[۰-۹]/g, (d) => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(d)])
    .replace(/[٠-٩]/g, (d) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)]);
}
function toFaDigits(s) {
  return String(s || "").replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}
function pad2(n) {
  const x = Number(n) || 0;
  return x < 10 ? `0${x}` : String(x);
}

function getJalaliPartsFromDate(d) {
  try {
    const y = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric" }).format(d);
    const m = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { month: "numeric" }).format(d);
    const day = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { day: "numeric" }).format(d);
    return {
      jy: Number(toEnDigits(y)) || 1400,
      jm: Number(toEnDigits(m)) || 1,
      jd: Number(toEnDigits(day)) || 1,
    };
  } catch {
    return { jy: 1400, jm: 1, jd: 1 };
  }
}

function JalaliPopupDatePicker({ value, onChange, theme, buttonClassName, hideIcon }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const popRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  const nowParts = useMemo(() => getJalaliPartsFromDate(new Date()), []);
  const initial = useMemo(() => {
    const v = String(value || "");
    const m = v.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if (m) {
      return { jy: Number(m[1]), jm: Number(m[2]), jd: Number(m[3]) };
    }
    return nowParts;
  }, [value, nowParts]);

  const [jy, setJy] = useState(initial.jy);
  const [jm, setJm] = useState(initial.jm);
  const [jd, setJd] = useState(initial.jd);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      const t = e.target;
      if (popRef.current && popRef.current.contains(t)) return;
      if (btnRef.current && btnRef.current.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open]);

  const years = useMemo(() => {
    const base = nowParts.jy || 1400;
    const arr = [];
    for (let y = base - 10; y <= base + 10; y++) arr.push(y);
    return arr;
  }, [nowParts.jy]);

  const days = useMemo(() => {
    const max = jm <= 6 ? 31 : jm <= 11 ? 30 : 29;
    const arr = [];
    for (let d = 1; d <= max; d++) arr.push(d);
    return arr;
  }, [jm]);

  useEffect(() => {
    const max = jm <= 6 ? 31 : jm <= 11 ? 30 : 29;
    if (jd > max) setJd(max);
  }, [jm, jd]);

  const preview = `${jy}/${pad2(jm)}/${pad2(jd)}`;

  const defaultBtnCls =
    "w-full h-11 px-3 rounded-xl border text-right flex items-center justify-between gap-2 transition " +
    (theme === "dark"
      ? "border-white/15 bg-white/5 text-white/90 hover:bg-white/10"
      : "border-black/10 bg-white text-neutral-900 hover:bg-black/[0.02]");

  const recalcPos = () => {
    const btn = btnRef.current;
    if (!btn) return;

    const r = btn.getBoundingClientRect();
    const margin = 8;

    const right = Math.max(margin, window.innerWidth - r.right);

    let top = r.bottom + margin;

    const pop = popRef.current;
    if (pop) {
      const pr = pop.getBoundingClientRect();
      const h = pr.height || 0;

      if (top + h > window.innerHeight - margin) {
        const above = r.top - h - margin;
        if (above >= margin) top = above;
        else top = Math.max(margin, window.innerHeight - h - margin);
      }
    }

    setPos({ top, right });
  };

  useEffect(() => {
    if (!open) return;

    recalcPos();
    const raf = requestAnimationFrame(() => recalcPos());

    const onResize = () => recalcPos();
    const onScrollAny = () => recalcPos();

    window.addEventListener("resize", onResize);
    document.addEventListener("scroll", onScrollAny, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("scroll", onScrollAny, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={buttonClassName ? buttonClassName : defaultBtnCls}
      >
        <span className={value ? "" : theme === "dark" ? "text-white/50" : "text-neutral-400"}>
          {value ? toFaDigits(value) : ""}
        </span>

        {!hideIcon && (
          <span className={theme === "dark" ? "text-white/50" : "text-neutral-500"}>
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div
            ref={popRef}
            className={
              "fixed z-[9999] w-[min(420px,calc(100vw-24px))] rounded-2xl border shadow-lg p-4 " +
              (theme === "dark" ? "border-white/10 bg-neutral-900 text-white" : "border-black/10 bg-white text-neutral-900")
            }
            style={{ top: pos.top, right: pos.right }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-sm">انتخاب تاریخ</div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={
                  "h-9 w-9 rounded-xl border flex items-center justify-center transition " +
                  (theme === "dark" ? "border-white/10 hover:bg-white/10" : "border-black/10 hover:bg-black/[0.04]")
                }
                aria-label="بستن"
                title="بستن"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className={theme === "dark" ? "text-white/70 text-xs mb-1" : "text-neutral-600 text-xs mb-1"}>سال</div>
                <select
                  value={jy}
                  onChange={(e) => setJy(Number(e.target.value))}
                  className={
                    "w-full h-11 px-3 rounded-xl border outline-none " +
                    (theme === "dark" ? "border-white/15 bg-white/5 text-white" : "border-black/10 bg-white text-neutral-900")
                  }
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {toFaDigits(y)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className={theme === "dark" ? "text-white/70 text-xs mb-1" : "text-neutral-600 text-xs mb-1"}>ماه</div>
                <select
                  value={jm}
                  onChange={(e) => setJm(Number(e.target.value))}
                  className={
                    "w-full h-11 px-3 rounded-xl border outline-none " +
                    (theme === "dark" ? "border-white/15 bg-white/5 text-white" : "border-black/10 bg-white text-neutral-900")
                  }
                >
                  {PERSIAN_MONTHS.map((name, idx) => (
                    <option key={name} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className={theme === "dark" ? "text-white/70 text-xs mb-1" : "text-neutral-600 text-xs mb-1"}>روز</div>
                <select
                  value={jd}
                  onChange={(e) => setJd(Number(e.target.value))}
                  className={
                    "w-full h-11 px-3 rounded-xl border outline-none " +
                    (theme === "dark" ? "border-white/15 bg-white/5 text-white" : "border-black/10 bg-white text-neutral-900")
                  }
                >
                  {days.map((d) => (
                    <option key={d} value={d}>
                      {toFaDigits(d)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className={theme === "dark" ? "text-white/70 text-xs" : "text-neutral-600 text-xs"}>
                پیش نمایش: <span className="font-semibold">{toFaDigits(preview)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onChange(preview);
                    setOpen(false);
                  }}
                  className={
                    "h-10 px-4 rounded-xl transition " +
                    (theme === "dark" ? "bg-white text-black hover:bg-white/90" : "bg-black text-white hover:bg-black/90")
                  }
                >
                  تایید
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className={
                    "h-10 px-4 rounded-xl border transition " +
                    (theme === "dark" ? "border-white/15 hover:bg-white/10" : "border-black/10 hover:bg-black/[0.04]")
                  }
                >
                  بستن
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default function LettersPage() {
  const API_BASE = (window.API_URL || "/api").replace(/\/+$/, "");
  async function api(path, opt = {}) {
    const res = await fetch(API_BASE + path, {
      credentials: "include",
      ...opt,
      headers: { "Content-Type": "application/json", ...(opt.headers || {}) },
    });
    const txt = await res.text();
    let data = {};
    try {
      data = txt ? JSON.parse(txt) : {};
    } catch {}
    if (!res.ok) throw new Error(data?.error || data?.message || "request_failed");
    return data;
  }

  const [theme, setTheme] = useState(() => (document.documentElement.classList.contains("dark") ? "dark" : "light"));
  useEffect(() => {
    const el = document.documentElement;
    const apply = () => setTheme(el.classList.contains("dark") ? "dark" : "light");
    apply();
    const obs = new MutationObserver(() => apply());
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // ===== list filter tab (ONLY filter) =====
  const [tab, setTab] = useState("all");

  // ===== form open + kind (kind is NOT tied to tab) =====
  const [formOpen, setFormOpen] = useState(false);
  const [formKind, setFormKind] = useState("incoming"); // incoming|outgoing|internal

  // ✅ edit state
  const [editingId, setEditingId] = useState(null);

  // ===== upload modal =====
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFor, setUploadFor] = useState("incoming");
  const closeUpload = () => setUploadOpen(false);

  useEffect(() => {
    if (!uploadOpen) return;
    const onEsc = (e) => {
      if (e.key === "Escape") closeUpload();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadOpen, uploadFor]);

  // ===== fields =====
  const [category, setCategory] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState([]);

  const [letterNo, setLetterNo] = useState("");
  const [letterDate, setLetterDate] = useState("");

  const [fromName, setFromName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [toName, setToName] = useState("");
  const [subject, setSubject] = useState("");

  const [hasAttachment, setHasAttachment] = useState(false);
  const [incomingAttachmentTitle, setIncomingAttachmentTitle] = useState("");
  const [outgoingAttachmentTitle, setOutgoingAttachmentTitle] = useState("");
  const [internalAttachmentTitle, setInternalAttachmentTitle] = useState("");

  const [returnToIds, setReturnToIds] = useState([""]);
  const [piroIds, setPiroIds] = useState([""]);
  const [myLetters, setMyLetters] = useState([]);

  // tags (support multiple possible /tags responses)
  const [tags, setTags] = useState([]);
  const [tagCategories, setTagCategories] = useState([]);

  const [incomingTagIds, setIncomingTagIds] = useState([]);
  const [outgoingTagIds, setOutgoingTagIds] = useState([]);
  const [internalTagIds, setInternalTagIds] = useState([]);

  const [incomingSecretariatDate, setIncomingSecretariatDate] = useState("");
  const [outgoingSecretariatDate, setOutgoingSecretariatDate] = useState("");
  const [internalSecretariatDate, setInternalSecretariatDate] = useState("");

  const [incomingSecretariatNo, setIncomingSecretariatNo] = useState("");
  const [outgoingSecretariatNo, setOutgoingSecretariatNo] = useState("");
  const [internalSecretariatNo, setInternalSecretariatNo] = useState("");

  const [incomingReceiverName, setIncomingReceiverName] = useState("");
  const [outgoingReceiverName, setOutgoingReceiverName] = useState("");
  const [internalReceiverName, setInternalReceiverName] = useState("");

  // ===== View modal =====
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLetter, setViewLetter] = useState(null);
  const [viewAttIdx, setViewAttIdx] = useState(0);
  const closeView = () => setViewOpen(false);
  const openView = (l) => {
    setViewLetter(l || null);
    setViewAttIdx(0);
    setViewOpen(true);
  };

  useEffect(() => {
    if (!viewOpen) return;
    const onEsc = (e) => {
      if (e.key === "Escape") closeView();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewOpen]);

  // ===== Filters (ALL in one border) =====
  const [filterQuick, setFilterQuick] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filterTagIds, setFilterTagIds] = useState([]);
  const [filterSubject, setFilterSubject] = useState("");
  const [filterOrg, setFilterOrg] = useState("");
  const [filterLetterNo, setFilterLetterNo] = useState("");

  // ===== Table selection + pagination =====
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(0);

  // ===== Uploader state (incoming/outgoing/internal) =====
  const [docFilesByType, setDocFilesByType] = useState({ incoming: [], outgoing: [], internal: [] });

  const setDocFilesFor = (which, updater) => {
    setDocFilesByType((prev) => {
      const cur = Array.isArray(prev?.[which]) ? prev[which] : [];
      const next = typeof updater === "function" ? updater(cur) : updater;
      return { ...prev, [which]: next };
    });
  };

  const currentDocFiles = useMemo(() => {
    return Array.isArray(docFilesByType?.[uploadFor]) ? docFilesByType[uploadFor] : [];
  }, [docFilesByType, uploadFor]);

  const uploadFileToLetter = (file, letterId, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", API_BASE + "/uploads/letters");
      xhr.withCredentials = true;

      const fd = new FormData();
      fd.append("file", file);
      fd.append("letter_id", String(letterId));

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && typeof onProgress === "function") {
          const p = Math.round((e.loaded / e.total) * 100);
          onProgress(p);
        }
      };

      xhr.onreadystatechange = () => {
        if (xhr.readyState !== 4) return;
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
            resolve(data);
          } catch {
            resolve({});
          }
        } else {
          reject(new Error("خطا در آپلود فایل"));
        }
      };

      xhr.onerror = () => reject(new Error("خطا در آپلود فایل"));
      xhr.send(fd);
    });
  };

  const addFilesToUpload = async (which, fileList) => {
    const list = Array.from(fileList || []);
    if (!list.length) return;

    for (const rawFile of list) {
      const isPdf = rawFile.type === "application/pdf" || rawFile.name.toLowerCase().endsWith(".pdf");
      const isImg = rawFile.type && rawFile.type.startsWith("image/");

      if (!isImg && !isPdf) {
        alert("فقط تصویر و PDF مجاز است.");
        continue;
      }

      const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const previewUrl = isImg ? URL.createObjectURL(rawFile) : null;

      setDocFilesFor(which, (prev) => [
        ...prev,
        {
          id,
          name: rawFile.name,
          size: rawFile.size,
          type: rawFile.type,
          status: "ready",
          progress: 0,
          error: "",
          serverId: null,
          url: null,
          previewUrl,
          file: rawFile,
          optimizedFile: rawFile,
        },
      ]);
    }
  };

  const removeDocFile = (which, id) => {
    setDocFilesFor(which, (prev) => {
      const target = prev.find((x) => x.id === id);
      if (target?.previewUrl) {
        try {
          URL.revokeObjectURL(target.previewUrl);
        } catch {}
      }
      return prev.filter((x) => x.id !== id);
    });
  };

  useEffect(() => {
    return () => {
      const all = [
        ...(Array.isArray(docFilesByType?.incoming) ? docFilesByType.incoming : []),
        ...(Array.isArray(docFilesByType?.outgoing) ? docFilesByType.outgoing : []),
        ...(Array.isArray(docFilesByType?.internal) ? docFilesByType.internal : []),
      ];
      all.forEach((f) => {
        if (f?.previewUrl) {
          try {
            URL.revokeObjectURL(f.previewUrl);
          } catch {}
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refetchLetters = async () => {
    const r = await api("/letters/mine");
    const items = Array.isArray(r?.items) ? r.items : Array.isArray(r) ? r : [];
    setMyLetters(items);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const p = await api("/projects");
        const items = Array.isArray(p?.items) ? p.items : Array.isArray(p) ? p : [];
        if (!mounted) return;
        setProjects(items);
      } catch {
        if (!mounted) return;
        setProjects([]);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await api("/letters/mine");
        const items = Array.isArray(r?.items) ? r.items : Array.isArray(r) ? r : [];
        if (!mounted) return;
        setMyLetters(items);
      } catch {
        if (!mounted) return;
        setMyLetters([]);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // try newer API first
        let r;
        try {
          r = await api("/tags?scope=letters");
        } catch {
          r = await api("/tags");
        }

        const cats = Array.isArray(r?.categories) ? r.categories : Array.isArray(r?.cats) ? r.cats : [];
        const ts = Array.isArray(r?.tags)
          ? r.tags
          : Array.isArray(r?.items)
          ? r.items
          : Array.isArray(r)
          ? r
          : [];

        if (!mounted) return;
        setTagCategories(cats);
        setTags(ts);
      } catch {
        if (!mounted) return;
        setTagCategories([]);
        setTags([]);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const todayJalaliLong = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date());
    } catch {
      return "";
    }
  }, []);

  const todayJalaliYmd = useMemo(() => {
    try {
      const p = getJalaliPartsFromDate(new Date());
      return `${p.jy}/${pad2(p.jm)}/${pad2(p.jd)}`;
    } catch {
      return "";
    }
  }, []);

  useEffect(() => {
    if (!incomingSecretariatDate) setIncomingSecretariatDate(todayJalaliYmd);
    if (!outgoingSecretariatDate) setOutgoingSecretariatDate(todayJalaliYmd);
    if (!internalSecretariatDate) setInternalSecretariatDate(todayJalaliYmd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayJalaliYmd]);

  const inputBase = "w-full h-11 px-3 rounded-xl border outline-none transition text-right";
  const inputCls =
    theme === "dark"
      ? inputBase + " border-white/15 bg-white/5 text-white placeholder:text-white/40 focus:bg-white/10"
      : inputBase + " border-black/10 bg-white text-neutral-900 placeholder:text-neutral-400 focus:bg-black/[0.02]";

  const labelCls = theme === "dark" ? "text-white/70 text-xs mb-1" : "text-neutral-600 text-xs mb-1";

  const chipBase =
    "inline-flex items-center justify-center gap-2 px-4 h-9 rounded-full border text-xs font-semibold whitespace-nowrap transition";
  const chipCls =
    theme === "dark"
      ? chipBase + " border-white/15 bg-white/5 text-white hover:bg-white/10"
      : chipBase + " border-black/10 bg-white text-neutral-900 hover:bg-black/[0.02]";
  const selectedTagChipCls = chipBase + " border-black bg-black text-white";

  const sendBtnCls =
    "h-11 w-11 rounded-xl flex items-center justify-center transition ring-1 " +
    (theme === "dark"
      ? "bg-white text-black ring-white/15 hover:bg-white/90"
      : "bg-black text-white ring-black/15 hover:bg-black/90");
  const sendIconCls = "w-5 h-5 " + (theme === "dark" ? "invert-0" : "invert");

  const findProject = (id) => projects.find((p) => String(p?.id) === String(id));

  const letterIdOf = (l) => {
    const raw = l?.id ?? l?.letter_id ?? l?.letterId ?? l?._id;
    const id = Number(raw);
    return id && Number.isFinite(id) ? id : String(raw || "");
  };

  const letterKindOf = (l) => {
    const v = String(l?.kind || l?.type || l?.direction || l?.io || l?.tab || l?.letter_type || "")
      .toLowerCase()
      .trim();
    if (v.includes("out")) return "outgoing";
    if (v.includes("in") && !v.includes("int")) return "incoming";
    if (v.includes("internal") || v.includes("inside") || v.includes("dakheli") || v.includes("int")) return "internal";
    if (v === "o" || v === "outgoing") return "outgoing";
    if (v === "i" || v === "incoming") return "incoming";
    if (v === "internal") return "internal";
    return "incoming";
  };

  const letterNoOf = (l) => String(l?.letter_no ?? l?.no ?? l?.number ?? l?.letterNo ?? "");
  const letterDateOf = (l) => String(l?.letter_date ?? l?.date ?? l?.letterDate ?? "");
  const fromToOf = (l) => {
    const a = String(l?.from_name ?? l?.from ?? "");
    const b = String(l?.to_name ?? l?.to ?? "");
    const s = `${a}${a && b ? " / " : ""}${b}`.trim();
    return s || "—";
  };
  const orgOf = (l) => String(l?.org_name ?? l?.org ?? l?.organization ?? l?.company ?? "");
  const subjectOf = (l) => String(l?.subject ?? l?.title ?? "");

  const categoryOf = (l) => String(l?.category ?? l?.category_name ?? l?.categoryTitle ?? "");
  const categoryLabelOf = (l) => {
    const c = String(categoryOf(l) || "");
    if (c === "project") return "پروژه‌ها";
    return c || "—";
  };
  const categoryLabel = (c) => {
    const v = String(c || "");
    if (v === "project") return "پروژه‌ها";
    return v || "";
  };

  const attachmentsOf = (l) => {
    const raw =
      l?.attachments ??
      l?.attachment ??
      l?.files ??
      l?.files_json ??
      l?.attachments_json ??
      l?.attachment_json ??
      l?.attachmentsJson;

    if (!raw) return [];
    if (Array.isArray(raw)) return raw;

    if (typeof raw === "string") {
      try {
        const j = JSON.parse(raw);
        return Array.isArray(j) ? j : [];
      } catch {
        return [];
      }
    }

    if (typeof raw === "object") {
      const arr = raw?.items;
      if (Array.isArray(arr)) return arr;
    }

    return [];
  };

  const attachmentUrlOf = (a) => {
    const u = a?.url ?? a?.href ?? a?.path ?? a?.public_url ?? a?.publicUrl ?? a?.file_url ?? a?.fileUrl;
    return String(u || "");
  };

  const attachmentNameOf = (a) => {
    const n = a?.name ?? a?.filename ?? a?.file_name ?? a?.fileName ?? a?.original_name ?? a?.originalName;
    return String(n || "");
  };

  const attachmentTypeOf = (a) => String(a?.type ?? a?.mime ?? a?.mime_type ?? a?.mimeType ?? "");
  const attachmentSizeOf = (a) => {
    const v = a?.size ?? a?.bytes ?? a?.file_size ?? a?.fileSize;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const isPdfUrl = (url) => String(url || "").toLowerCase().includes(".pdf");
  const isImageUrl = (url) => {
    const u = String(url || "").toLowerCase();
    return u.includes(".png") || u.includes(".jpg") || u.includes(".jpeg") || u.includes(".webp") || u.includes(".gif");
  };

  const normalizeYmd = (s) => {
    const v = String(s || "").trim();
    const m = v.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (!m) return "";
    return `${m[1]}/${pad2(m[2])}/${pad2(m[3])}`;
  };

  const applyQuickRange = (key) => {
    const now = new Date();
    const end = now;
    const start = new Date(now.getTime());

    if (key === "week") start.setDate(start.getDate() - 7);
    if (key === "2w") start.setDate(start.getDate() - 14);
    if (key === "1m") start.setMonth(start.getMonth() - 1);
    if (key === "3m") start.setMonth(start.getMonth() - 3);
    if (key === "6m") start.setMonth(start.getMonth() - 6);

    const ps = getJalaliPartsFromDate(start);
    const pe = getJalaliPartsFromDate(end);

    const from = `${ps.jy}/${pad2(ps.jm)}/${pad2(ps.jd)}`;
    const to = `${pe.jy}/${pad2(pe.jm)}/${pad2(pe.jd)}`;

    setFilterFromDate(from);
    setFilterToDate(to);
  };

  useEffect(() => {
    if (!filterQuick) return;
    applyQuickRange(filterQuick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterQuick]);

  const clearAllFilters = () => {
    setFilterQuick("");
    setFilterFromDate("");
    setFilterToDate("");
    setFilterTagIds([]);
    setFilterSubject("");
    setFilterOrg("");
    setFilterLetterNo("");
  };

  const toggleQuickChip = (k) => {
    setFilterQuick((prev) => {
      const next = prev === k ? "" : k;
      if (prev === k) {
        setFilterFromDate("");
        setFilterToDate("");
      }
      return next;
    });
  };

  const toggleFilterTag = (id) => {
    const sid = String(id || "");
    if (!sid) return;
    setFilterTagIds((arr) => (arr.some((x) => String(x) === sid) ? arr.filter((x) => String(x) !== sid) : [...arr, sid]));
  };

  const toggleTagForKind = (kind, id) => {
    const sid = String(id || "");
    if (!sid) return;

    if (kind === "incoming") {
      setIncomingTagIds((arr) => (arr.some((x) => String(x) === sid) ? arr.filter((x) => String(x) !== sid) : [...arr, sid]));
    } else if (kind === "outgoing") {
      setOutgoingTagIds((arr) => (arr.some((x) => String(x) === sid) ? arr.filter((x) => String(x) !== sid) : [...arr, sid]));
    } else {
      setInternalTagIds((arr) => (arr.some((x) => String(x) === sid) ? arr.filter((x) => String(x) !== sid) : [...arr, sid]));
    }
  };

  const latestTags = useMemo(() => {
    const arr = Array.isArray(tags) ? tags.slice() : [];
    arr.sort((a, b) => {
      const ai = Number(a?.id);
      const bi = Number(b?.id);
      if (Number.isFinite(ai) && Number.isFinite(bi)) return bi - ai;
      const as = String(a?.id ?? "");
      const bs = String(b?.id ?? "");
      return bs.localeCompare(as);
    });
    return arr.slice(0, 14);
  }, [tags]);

  const tagCapsFor = (selectedIds) => {
    const sel = Array.isArray(selectedIds) ? selectedIds.map(String) : [];
    const selSet = new Set(sel);
    const selectedObjs = (Array.isArray(tags) ? tags : []).filter((t) => selSet.has(String(t?.id)));
    const latestObjs = (Array.isArray(latestTags) ? latestTags : []).filter((t) => !selSet.has(String(t?.id)));
    const merged = [...selectedObjs, ...latestObjs];
    const seen = new Set();
    return merged.filter((t) => {
      const id = String(t?.id ?? "");
      if (!id) return false;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  };

  const filteredLetters = useMemo(() => {
    const arr = Array.isArray(myLetters) ? myLetters : [];
    const sSub = String(filterSubject || "").trim().toLowerCase();
    const sOrg = String(filterOrg || "").trim().toLowerCase();
    const sNo = String(filterLetterNo || "").trim().toLowerCase();
    const fromY = normalizeYmd(filterFromDate);
    const toY = normalizeYmd(filterToDate);

    return arr.filter((l) => {
      const kind = letterKindOf(l);

      if (tab !== "all") {
        if (kind !== tab) return false;
      }

      if (sSub) {
        const x = String(subjectOf(l) || "").toLowerCase();
        if (!x.includes(sSub)) return false;
      }

      if (sOrg) {
        const x = String(orgOf(l) || "").toLowerCase();
        if (!x.includes(sOrg)) return false;
      }

      if (sNo) {
        const x = String(letterNoOf(l) || "").toLowerCase();
        if (!x.includes(sNo)) return false;
      }

      if (filterTagIds.length > 0) {
        const letterTags = Array.isArray(l?.tag_ids) ? l.tag_ids : Array.isArray(l?.tagIds) ? l.tagIds : [];
        const set = new Set(letterTags.map((x) => String(x)));
        const ok = filterTagIds.every((x) => set.has(String(x)));
        if (!ok) return false;
      }

      const d = normalizeYmd(letterDateOf(l));
      if (fromY && d && d < fromY) return false;
      if (toY && d && d > toY) return false;

      return true;
    });
  }, [myLetters, tab, filterSubject, filterOrg, filterLetterNo, filterTagIds, filterFromDate, filterToDate]);

  useEffect(() => {
    setSelectedIds(new Set());
    setPage(0);
  }, [tab, rowsPerPage, filterQuick, filterFromDate, filterToDate, filterTagIds, filterSubject, filterOrg, filterLetterNo]);

  const total = filteredLetters.length;
  const pageCount = Math.max(1, Math.ceil(total / Math.max(1, rowsPerPage)));
  const safePage = Math.min(Math.max(0, page), pageCount - 1);
  const startIdx = safePage * rowsPerPage;
  const endIdx = Math.min(total, startIdx + rowsPerPage);
  const pageItems = filteredLetters.slice(startIdx, endIdx);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage]);

  const visibleIds = useMemo(() => pageItems.map((l) => String(letterIdOf(l))), [pageItems]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(String(id)));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(String(id))) && !allVisibleSelected;

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(String(id)));
      } else {
        visibleIds.forEach((id) => next.add(String(id)));
      }
      return next;
    });
  };

  const toggleRowSelect = (id) => {
    const sid = String(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  };

  const iconBtnCls =
    "h-10 w-10 inline-grid place-items-center !bg-transparent !ring-0 !border-0 !shadow-none " +
    "hover:opacity-80 active:opacity-70 transition disabled:opacity-50";

  const tableWrapCls =
    "bg-white text-black rounded-2xl border border-black/10 overflow-hidden " +
    "dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800";

  const theadRowCls =
    "bg-neutral-200 text-black border-b border-neutral-300 " +
    "dark:bg-white/10 dark:text-neutral-100 dark:border-neutral-700";

  const tbodyCls = "[&_td]:text-black dark:[&_td]:text-neutral-100";
  const rowDividerCls = "border-b border-neutral-300 dark:border-neutral-700";

  const secretariatPickerBtnCls = (val) =>
    "w-full h-11 px-3 rounded-xl border flex items-center justify-between gap-2 transition text-right " +
    (theme === "dark"
      ? "border-white/15 bg-white/5 text-white/90 hover:bg-white/10"
      : "border-black/10 bg-white text-neutral-900 hover:bg-black/[0.02]") +
    (val ? "" : theme === "dark" ? " text-white/50" : " text-neutral-400");

  const secretariatLongText = (_ymd) => {
    return todayJalaliLong || "";
  };

  const openUpload = (which) => {
    setUploadFor(which);
    setUploadOpen(true);
  };

  const uploadTriggerCls =
    "h-11 px-3 rounded-xl border transition flex items-center justify-center gap-2 whitespace-nowrap outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 " +
    (theme === "dark"
      ? "border-white/15 bg-white/5 text-white/90 hover:bg-white/10"
      : "border-black/10 bg-white text-neutral-900 hover:bg-black/[0.02]");

  const normalizeAttachmentForPayload = (x) => {
    const url = String(x?.url || "");
    if (!url) return null;
    const name = String(x?.name || "");
    const type = String(x?.type || "");
    const size = Number(x?.size || 0) || 0;
    const out = {};
    if (name) out.name = name;
    if (url) out.url = url;
    if (type) out.type = type;
    if (size) out.size = size;
    return Object.keys(out).length ? out : null;
  };

  const resetForm = () => {
    setCategory("");
    setProjectId("");
    setLetterNo("");
    setLetterDate("");
    setFromName("");
    setOrgName("");
    setToName("");
    setSubject("");

    setHasAttachment(false);
    setIncomingAttachmentTitle("");
    setOutgoingAttachmentTitle("");
    setInternalAttachmentTitle("");

    setReturnToIds([""]);
    setPiroIds([""]);

    setIncomingTagIds([]);
    setOutgoingTagIds([]);
    setInternalTagIds([]);

    setIncomingSecretariatDate(todayJalaliYmd || "");
    setOutgoingSecretariatDate(todayJalaliYmd || "");
    setInternalSecretariatDate(todayJalaliYmd || "");

    setIncomingSecretariatNo("");
    setOutgoingSecretariatNo("");
    setInternalSecretariatNo("");

    setIncomingReceiverName("");
    setOutgoingReceiverName("");
    setInternalReceiverName("");

    setDocFilesByType({ incoming: [], outgoing: [], internal: [] });

    setEditingId(null);
    setFormKind("incoming");
  };

  const startEdit = (l) => {
    const kind = letterKindOf(l);
    const id = String(letterIdOf(l));

    setEditingId(id);
    setFormOpen(true);
    setFormKind(kind);

    setCategory(String(l?.category ?? l?.category_name ?? l?.categoryTitle ?? ""));
    const pid = l?.project_id ?? l?.projectId ?? l?.projectID ?? null;
    setProjectId(pid ? String(pid) : "");

    setLetterNo(String(l?.letter_no ?? l?.letterNo ?? l?.no ?? l?.number ?? ""));
    setLetterDate(String(l?.letter_date ?? l?.letterDate ?? l?.date ?? ""));

    setFromName(String(l?.from_name ?? l?.fromName ?? l?.from ?? ""));
    setToName(String(l?.to_name ?? l?.toName ?? l?.to ?? ""));
    setOrgName(String(l?.org_name ?? l?.orgName ?? l?.org ?? l?.organization ?? l?.company ?? ""));
    setSubject(String(l?.subject ?? l?.title ?? ""));

    const ha = l?.has_attachment ?? l?.hasAttachment ?? false;
    setHasAttachment(!!ha);

    const atTitle = String(l?.attachment_title ?? l?.attachmentTitle ?? "");
    if (kind === "incoming") setIncomingAttachmentTitle(atTitle);
    else if (kind === "outgoing") setOutgoingAttachmentTitle(atTitle);
    else setInternalAttachmentTitle(atTitle);

    const rids = Array.isArray(l?.return_to_ids) ? l.return_to_ids : Array.isArray(l?.returnToIds) ? l.returnToIds : [];
    setReturnToIds(rids.length ? rids.map((x) => String(x)) : [""]);

    const pids = Array.isArray(l?.piro_ids) ? l.piro_ids : Array.isArray(l?.piroIds) ? l.piroIds : [];
    setPiroIds(pids.length ? pids.map((x) => String(x)) : [""]);

    const tids = Array.isArray(l?.tag_ids) ? l.tag_ids : Array.isArray(l?.tagIds) ? l.tagIds : [];
    if (kind === "incoming") setIncomingTagIds(tids.map((x) => String(x)));
    else if (kind === "outgoing") setOutgoingTagIds(tids.map((x) => String(x)));
    else setInternalTagIds(tids.map((x) => String(x)));

    const sDate = String(l?.secretariat_date ?? l?.secretariatDate ?? "");
    const sNo = String(l?.secretariat_no ?? l?.secretariatNo ?? "");
    const rName = String(l?.receiver_name ?? l?.receiverName ?? "");
    if (kind === "incoming") {
      setIncomingSecretariatDate(sDate || todayJalaliYmd || "");
      setIncomingSecretariatNo(sNo || "");
      setIncomingReceiverName(rName || "");
    } else if (kind === "outgoing") {
      setOutgoingSecretariatDate(sDate || todayJalaliYmd || "");
      setOutgoingSecretariatNo(sNo || "");
      setOutgoingReceiverName(rName || "");
    } else {
      setInternalSecretariatDate(sDate || todayJalaliYmd || "");
      setInternalSecretariatNo(sNo || "");
      setInternalReceiverName(rName || "");
    }

    const atts = attachmentsOf(l);
    const mapped = (Array.isArray(atts) ? atts : []).map((a, i) => {
      const url = attachmentUrlOf(a);
      const nameRaw = attachmentNameOf(a);
      const name =
        String(nameRaw || "").trim() ||
        (() => {
          try {
            const u = String(url);
            const parts = u.split("?")[0].split("/");
            return parts[parts.length - 1] || "فایل";
          } catch {
            return "فایل";
          }
        })();
      const type = attachmentTypeOf(a) || (isPdfUrl(url) ? "application/pdf" : "");
      const size = attachmentSizeOf(a);
      return {
        id: `att_${id}_${i}`,
        name,
        size,
        type,
        status: "done",
        progress: 100,
        error: "",
        serverId: a?.id ?? a?.file_id ?? null,
        url: url || null,
        previewUrl: null,
        file: null,
        optimizedFile: null,
      };
    });

    setDocFilesByType((prev) => ({ ...prev, [kind]: mapped }));
  };

  const submitLetter = async () => {
    const kind = formKind;

    const attachmentTitle =
      kind === "incoming" ? incomingAttachmentTitle : kind === "outgoing" ? outgoingAttachmentTitle : internalAttachmentTitle;

    const tagIds = kind === "incoming" ? incomingTagIds : kind === "outgoing" ? outgoingTagIds : internalTagIds;

    const secretariatDate =
      kind === "incoming" ? incomingSecretariatDate : kind === "outgoing" ? outgoingSecretariatDate : internalSecretariatDate;

    const secretariatNo =
      kind === "incoming" ? incomingSecretariatNo : kind === "outgoing" ? outgoingSecretariatNo : internalSecretariatNo;

    const receiverName =
      kind === "incoming" ? incomingReceiverName : kind === "outgoing" ? outgoingReceiverName : internalReceiverName;

    const pId = projectId ? Number(projectId) : null;
    const files = Array.isArray(docFilesByType?.[kind]) ? docFilesByType[kind] : [];

    const reused = files
      .filter((f) => f && f.status === "done" && !!f.url && !f.file && !f.optimizedFile)
      .map((f) =>
        normalizeAttachmentForPayload({
          name: f.name,
          url: f.url,
          type: f.type,
          size: f.size,
        })
      )
      .filter(Boolean);

    const queue = files.filter((f) => f && f.status !== "error" && (f.optimizedFile || f.file) && !f.url);

    const computedHasAttachment =
      !!hasAttachment || !!String(attachmentTitle || "").trim() || queue.length > 0 || reused.length > 0;

    const payload = {
      kind,
      category: category || "",
      projectId: pId && Number.isFinite(pId) ? pId : null,
      letterNo: letterNo || "",
      letterDate: letterDate || "",
      fromName: fromName || "",
      toName: toName || "",
      orgName: orgName || "",
      subject: subject || "",
      hasAttachment: computedHasAttachment,
      attachmentTitle: attachmentTitle || "",
      returnToIds: (Array.isArray(returnToIds) ? returnToIds : []).map(String).filter((x) => x && x.trim()),
      piroIds: (Array.isArray(piroIds) ? piroIds : []).map(String).filter((x) => x && x.trim()),
      tagIds: (Array.isArray(tagIds) ? tagIds : []).map(String).filter((x) => x && x.trim()),
      secretariatDate: secretariatDate || "",
      secretariatNo: secretariatNo || "",
      receiverName: receiverName || "",
      attachments: reused,
    };

    let saved;
    let newId = null;

    if (editingId) {
      try {
        saved = await api(`/letters/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) });
      } catch (_e) {
        saved = await api(`/letters?id=${encodeURIComponent(String(editingId))}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }
      newId = editingId;
    } else {
      saved = await api("/letters", { method: "POST", body: JSON.stringify(payload) });
      const item = saved?.item || saved;
      newId = item?.id ?? item?.letter_id ?? item?.letterId;
    }

    if (!newId) throw new Error("save_failed");
    const letterId = Number(newId) || newId;

    if (queue.length > 0) {
      for (const f of queue) {
        const fileToSend = f.optimizedFile || f.file;
        setDocFilesFor(kind, (prev) => prev.map((x) => (x.id === f.id ? { ...x, status: "uploading", progress: 0, error: "" } : x)));

        try {
          const res = await uploadFileToLetter(fileToSend, letterId, (p) => {
            setDocFilesFor(kind, (prev) => prev.map((x) => (x.id === f.id ? { ...x, progress: p } : x)));
          });

          setDocFilesFor(kind, (prev) =>
            prev.map((x) =>
              x.id === f.id
                ? {
                    ...x,
                    status: "done",
                    progress: 100,
                    serverId: res?.item?.id ?? res?.id ?? x.serverId,
                    url: res?.item?.url ?? res?.url ?? x.url,
                  }
                : x
            )
          );
        } catch (e) {
          setDocFilesFor(kind, (prev) =>
            prev.map((x) => (x.id === f.id ? { ...x, status: "error", error: e?.message || "خطا در آپلود فایل." } : x))
          );
        }
      }
    }

    await refetchLetters();
    resetForm();
    setFormOpen(false);
  };

  const deleteLetter = async (id) => {
    const ok = window.confirm("حذف شود؟");
    if (!ok) return;

    try {
      await api(`/letters/${encodeURIComponent(String(id))}`, { method: "DELETE" });
    } catch (_e) {
      await api(`/letters?id=${encodeURIComponent(String(id))}`, { method: "DELETE" });
    }

    await refetchLetters();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(String(id));
      return next;
    });
  };

  const InfoRow = ({ label, value }) => (
    <div className="grid grid-cols-12 gap-2 py-2">
      <div className={"col-span-4 text-xs font-semibold " + (theme === "dark" ? "text-white/70" : "text-neutral-600")}>{label}</div>
      <div className={"col-span-8 text-sm " + (theme === "dark" ? "text-white" : "text-neutral-900")}>{value || "—"}</div>
    </div>
  );

  const viewAttachments = useMemo(() => attachmentsOf(viewLetter), [viewLetter]); // eslint-disable-line react-hooks/exhaustive-deps
  const currentViewAttachment = useMemo(() => {
    const arr = Array.isArray(viewAttachments) ? viewAttachments : [];
    const a = arr[viewAttIdx] || arr[0] || null;
    return a;
  }, [viewAttachments, viewAttIdx]);

  const currentViewUrl = useMemo(() => attachmentUrlOf(currentViewAttachment), [currentViewAttachment]); // eslint-disable-line react-hooks/exhaustive-deps
  const currentViewName = useMemo(() => attachmentNameOf(currentViewAttachment), [currentViewAttachment]); // eslint-disable-line react-hooks/exhaustive-deps

  const viewHasAttachment = useMemo(() => {
    if (!viewLetter) return false;
    if (viewAttachments.length > 0) return true;
    const ha = viewLetter?.has_attachment ?? viewLetter?.hasAttachment;
    return !!ha;
  }, [viewLetter, viewAttachments]);

  const paginationIconBtnCls =
    "h-9 w-9 rounded-lg grid place-items-center transition !bg-transparent !ring-0 !border-0 !shadow-none " +
    (theme === "dark" ? "hover:bg-white/10" : "hover:bg-black/5") +
    " disabled:opacity-40 disabled:cursor-not-allowed";

  const addIconBtnCls =
    "h-11 w-11 rounded-xl flex items-center justify-center transition ring-1 p-2 " +
    (theme === "dark" ? "ring-neutral-800 hover:bg-white/10" : "ring-black/15 hover:bg-black/5");

  const addIconImgCls = "w-5 h-5 " + (theme === "dark" ? "dark:invert" : "");

  // ===== tag picker modal (for FILTER tags) =====
  const [tagPickOpen, setTagPickOpen] = useState(false);
  const [tagPickTab, setTagPickTab] = useState("letters");
  const [tagPickTemp, setTagPickTemp] = useState([]);

  const scopes = useMemo(() => {
    const ts = Array.isArray(tags) ? tags : [];
    const set = new Set();
    ts.forEach((t) => {
      const s = String(t?.scope || "").trim();
      if (s) set.add(s);
    });

    const hasLetters = set.has("letters");
    const hasExecution = set.has("execution");

    return [
      { id: "letters", label: "نامه‌ها و مستندات", scope: hasLetters ? "letters" : "" },
      { id: "execution", label: "اجرای پروژه‌ها", scope: hasExecution ? "execution" : "" },
      { id: "other", label: "سایر", scope: "" },
    ];
  }, [tags]);

  const openTagPicker = () => {
    setTagPickTemp((Array.isArray(filterTagIds) ? filterTagIds : []).map(String));
    setTagPickTab("letters");
    setTagPickOpen(true);
  };

  const closeTagPicker = () => setTagPickOpen(false);

  const toggleTempTag = (id) => {
    const sid = String(id || "");
    if (!sid) return;
    setTagPickTemp((arr) => (arr.some((x) => String(x) === sid) ? arr.filter((x) => String(x) !== sid) : [...arr, sid]));
  };

  const pickListForTab = useMemo(() => {
    const ts = Array.isArray(tags) ? tags : [];
    const current = scopes.find((x) => x.id === tagPickTab) || scopes[0];

    if (tagPickTab === "other") {
      // anything not letters/execution (or no scope)
      return ts.filter((t) => {
        const s = String(t?.scope || "").trim();
        return s !== "letters" && s !== "execution";
      });
    }

    const scope = String(current?.scope || "").trim();
    if (!scope) return ts;
    return ts.filter((t) => String(t?.scope || "").trim() === scope);
  }, [tags, tagPickTab, scopes]);

  // ===== reuse uploaded files =====
  const [pickSearch, setPickSearch] = useState("");

  const myLettersSorted = useMemo(() => {
    const arr = Array.isArray(myLetters) ? myLetters.slice() : [];
    arr.sort((a, b) => {
      const ai = Number(letterIdOf(a));
      const bi = Number(letterIdOf(b));
      if (Number.isFinite(ai) && Number.isFinite(bi)) return bi - ai;
      return String(letterIdOf(b)).localeCompare(String(letterIdOf(a)));
    });
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myLetters]);

  useEffect(() => {
    if (!uploadOpen) {
      setPickSearch("");
      return;
    }
    setPickSearch("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadOpen, uploadFor]);

  const allUploadedAttachments = useMemo(() => {
    const arr = Array.isArray(myLettersSorted) ? myLettersSorted : [];
    const map = new Map(); // key=url
    for (const l of arr) {
      const ln = String(l?.letter_no || letterNoOf(l) || "").trim();
      const atts = attachmentsOf(l);
      for (const a of Array.isArray(atts) ? atts : []) {
        const url = attachmentUrlOf(a);
        if (!url) continue;

        const nameRaw = attachmentNameOf(a);
        const name =
          String(nameRaw || "").trim() ||
          (() => {
            try {
              const u = String(url);
              const parts = u.split("?")[0].split("/");
              const base = parts[parts.length - 1] || "فایل";
              return base;
            } catch {
              return "فایل";
            }
          })();

        const type = attachmentTypeOf(a) || (isPdfUrl(url) ? "application/pdf" : "");
        const size = attachmentSizeOf(a);

        if (!map.has(String(url))) {
          map.set(String(url), { ...a, url, name, type, size, _letterNo: ln });
        }
      }
    }
    const out = Array.from(map.values());
    out.sort((a, b) => String(b?.name || "").localeCompare(String(a?.name || "")));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myLettersSorted]);

  const filteredUploadedAttachments = useMemo(() => {
    const q = String(pickSearch || "").trim().toLowerCase();
    const arr = Array.isArray(allUploadedAttachments) ? allUploadedAttachments : [];
    if (!q) return arr;
    return arr.filter((a) => {
      const name = String(attachmentNameOf(a) || a?.name || "").toLowerCase();
      const url = String(attachmentUrlOf(a) || a?.url || "").toLowerCase();
      return name.includes(q) || url.includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickSearch, allUploadedAttachments]);

  const addExistingAttachmentToCurrent = (which, att) => {
    const url = attachmentUrlOf(att);
    if (!url) return;

    const name = attachmentNameOf(att) || att?.name || "فایل";
    const type = attachmentTypeOf(att) || att?.type || (isPdfUrl(url) ? "application/pdf" : "");
    const size = attachmentSizeOf(att) || Number(att?.size || 0) || 0;

    setDocFilesFor(which, (prev) => {
      const exists = prev.some((x) => String(x?.url || "") === String(url));
      if (exists) return prev;

      const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      return [
        ...prev,
        {
          id,
          name,
          size,
          type,
          status: "done",
          progress: 100,
          error: "",
          serverId: null,
          url,
          previewUrl: null,
          file: null,
          optimizedFile: null,
        },
      ];
    });
  };

  const onDropUpload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const fl = e.dataTransfer?.files;
    if (fl && fl.length) {
      await addFilesToUpload(uploadFor, fl);
    }
  };

  const onDragOverUpload = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const filtersBoxCls =
    "rounded-2xl border p-3 md:p-4 " +
    (theme === "dark" ? "border-white/10 bg-white/5" : "border-black/10 bg-black/[0.02]");

  const kindLabel = (k) => (k === "outgoing" ? "صادره" : k === "internal" ? "داخلی" : "وارده");

  return (
    <div dir="rtl" className="mx-auto max-w-[1400px]">
      <Card className={"rounded-2xl border overflow-hidden " + (theme === "dark" ? "border-white/10 bg-neutral-900" : "border-black/10 bg-white")}>
        <div className="p-3 md:p-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="text-lg md:text-xl font-bold">نامه ها</div>

            <button
              type="button"
              onClick={() => {
                setFormOpen((v) => {
                  const next = !v;
                  if (next) {
                    setEditingId(null);
                    const def = tab !== "all" ? tab : "incoming";
                    setFormKind(def);
                    setUploadFor(def);
                  } else {
                    setEditingId(null);
                  }
                  return next;
                });
              }}
              className={
                "h-10 w-10 rounded-xl flex items-center justify-center transition ring-1 " +
                (theme === "dark" ? "ring-neutral-800 hover:bg-white/10" : "ring-black/15 hover:bg-black/5")
              }
              title={formOpen ? "بستن" : "افزودن"}
              aria-label={formOpen ? "بستن" : "افزودن"}
            >
              <img src={formOpen ? "/images/icons/listdarkhast.svg" : "/images/icons/afzodan.svg"} alt="" className="w-5 h-5 dark:invert" />
            </button>
          </div>

          {/* Filters (ALL inside one bordered box) */}
          {!formOpen && (
            <div className={filtersBoxCls}>
              <div className="flex flex-wrap items-end gap-2">
                {/* Tabs (filter only) + icons */}
                <div className="flex items-center gap-2">
                  {TABS.map((t) => {
                    const active = tab === t.id;
                    const isAll = t.id === "all";
                    const isOutgoing = t.id === "outgoing";
                    const isIncoming = t.id === "incoming";
                    const isInternal = t.id === "internal";

                    const cls =
                      "h-10 px-5 rounded-xl border transition text-sm font-semibold " +
                      (isAll
                        ? active
                          ? "bg-black text-white border-black"
                          : theme === "dark"
                          ? "bg-transparent text-white border-white/15 hover:bg-white/5"
                          : "bg-white text-neutral-900 border-black/15 hover:bg-black/[0.02]"
                        : isOutgoing
                        ? active
                          ? "bg-[#1a7431] text-white border-[#1a7431]"
                          : theme === "dark"
                          ? "bg-transparent text-white border-[#1a7431] hover:bg-white/5"
                          : "bg-white text-neutral-900 border-[#1a7431] hover:bg-black/[0.02]"
                        : isIncoming
                        ? active
                          ? "bg-[#4895ef] text-white border-[#4895ef]"
                          : theme === "dark"
                          ? "bg-transparent text-white border-[#4895ef] hover:bg-white/5"
                          : "bg-white text-neutral-900 border-[#4895ef] hover:bg-black/[0.02]"
                        : isInternal
                        ? active
                          ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white"
                          : theme === "dark"
                          ? "bg-transparent text-white border-white/15 hover:bg-white/5"
                          : "bg-white text-neutral-900 border-black/15 hover:bg-black/[0.02]"
                        : "");

                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setTab(t.id);
                          setEditingId(null);
                          if (t.id === "all") clearAllFilters();
                        }}
                        className={cls}
                      >
                        {t.icon ? (
                          <span className="inline-flex items-center gap-2">
                            <span>{t.label}</span>
                            <img src={t.icon} alt="" className="w-5 h-5 dark:invert" />
                          </span>
                        ) : (
                          t.label
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="min-w-[220px] flex-1">
                  <div className={labelCls}>موضوع</div>
                  <input value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className={inputCls} type="text" placeholder="جستجو بر اساس موضوع" />
                </div>

                <div className="min-w-[220px] flex-1">
                  <div className={labelCls}>شرکت/سازمان</div>
                  <input value={filterOrg} onChange={(e) => setFilterOrg(e.target.value)} className={inputCls} type="text" placeholder="جستجو بر اساس شرکت/سازمان" />
                </div>

                <div className="min-w-[200px]">
                  <div className={labelCls}>شماره نامه</div>
                  <input value={filterLetterNo} onChange={(e) => setFilterLetterNo(e.target.value)} className={inputCls} type="text" placeholder="جستجو بر اساس شماره" />
                </div>

                <div className="min-w-[170px]">
                  <div className={labelCls}>از</div>
                  <JalaliPopupDatePicker value={filterFromDate} onChange={setFilterFromDate} theme={theme} />
                </div>

                <div className="min-w-[170px]">
                  <div className={labelCls}>تا</div>
                  <JalaliPopupDatePicker value={filterToDate} onChange={setFilterToDate} theme={theme} />
                </div>
              </div>

              {/* Tags line (includes quick chips + tags + add button) */}
              <div className="mt-3">
                <div className={labelCls}>برچسب ها</div>

                <div className="flex flex-wrap items-center gap-2">
                  {QUICK_CHIPS.map(([k, lab]) => {
                    const active = filterQuick === k;
                    return (
                      <button key={k} type="button" onClick={() => toggleQuickChip(k)} className={active ? selectedTagChipCls : chipCls}>
                        {lab}
                      </button>
                    );
                  })}

                  {tagCapsFor(filterTagIds).map((t) => {
                    const id = String(t?.id);
                    const label = String(t?.name || t?.title || t?.label || id || "");
                    const active = filterTagIds.some((x) => String(x) === id);
                    return (
                      <button key={id} type="button" onClick={() => toggleFilterTag(id)} className={active ? selectedTagChipCls : chipCls} title={label} aria-label={label}>
                        <span className="truncate max-w-[200px]">{label}</span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={openTagPicker}
                    className={
                      "h-10 px-4 rounded-full border text-sm font-semibold inline-flex items-center gap-2 transition " +
                      (theme === "dark"
                        ? "border-white/15 bg-white/5 text-white hover:bg-white/10"
                        : "border-black/10 bg-white text-neutral-900 hover:bg-black/[0.02]")
                    }
                    aria-label="افزودن"
                    title="افزودن"
                  >
                    <span>افزودن</span>
                    <img src="/images/icons/afzodan.svg" alt="" className="w-5 h-5 dark:invert" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create/Edit form (kind selector inside form) */}
          {formOpen && (
            <div className="mt-4">
              <div className={filtersBoxCls}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <div className={labelCls}>نامه</div>
                    <select
                      value={formKind}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFormKind(v);
                        setUploadFor(v);
                      }}
                      className={inputCls}
                    >
                      <option value="incoming">وارده</option>
                      <option value="outgoing">صادره</option>
                      <option value="internal">داخلی</option>
                    </select>
                  </div>

                  <div>
                    <div className={labelCls}>دسته بندی نامه</div>
                    <select
                      value={category}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCategory(v);
                        if (v !== "project") setProjectId("");
                      }}
                      className={inputCls}
                    >
                      <option value=""></option>
                      <option value="project">پروژه‌ها</option>
                    </select>
                  </div>

                  {category === "project" && (
                    <div>
                      <div className={labelCls}>پروژه</div>
                      <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputCls}>
                        <option value=""></option>
                        {projects.map((p) => (
                          <option key={p.id} value={String(p.id)}>
                            {String(p.code || "")} {p.name ? `- ${p.name}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <div className={labelCls}>شماره نامه</div>
                    <input value={letterNo} onChange={(e) => setLetterNo(e.target.value)} className={inputCls} type="text" />
                  </div>

                  <div>
                    <div className={labelCls}>تاریخ نامه</div>
                    <JalaliPopupDatePicker value={letterDate} onChange={setLetterDate} theme={theme} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  <div>
                    <div className={labelCls}>از</div>
                    <input value={fromName} onChange={(e) => setFromName(e.target.value)} className={inputCls} type="text" />
                  </div>

                  <div>
                    <div className={labelCls}>شرکت/سازمان</div>
                    <input value={orgName} onChange={(e) => setOrgName(e.target.value)} className={inputCls} type="text" />
                  </div>

                  <div>
                    <div className={labelCls}>به</div>
                    <input value={toName} onChange={(e) => setToName(e.target.value)} className={inputCls} type="text" />
                  </div>
                </div>

                <div className="mt-3">
                  <div className={labelCls}>موضوع</div>
                  <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} type="text" />
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className={theme === "dark" ? "text-white/80 text-sm" : "text-neutral-800 text-sm"}>ضمیمه:</div>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="hasAttachment" checked={!hasAttachment} onChange={() => setHasAttachment(false)} />
                        <span className={theme === "dark" ? "text-white/80 text-sm" : "text-neutral-700 text-sm"}>ندارد</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="hasAttachment" checked={hasAttachment} onChange={() => setHasAttachment(true)} />
                        <span className={theme === "dark" ? "text-white/80 text-sm" : "text-neutral-700 text-sm"}>دارد</span>
                      </label>

                      <div className="min-w-[260px]">
                        <input
                          value={formKind === "incoming" ? incomingAttachmentTitle : formKind === "outgoing" ? outgoingAttachmentTitle : internalAttachmentTitle}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (formKind === "incoming") setIncomingAttachmentTitle(v);
                            else if (formKind === "outgoing") setOutgoingAttachmentTitle(v);
                            else setInternalAttachmentTitle(v);
                          }}
                          className={inputCls}
                          type="text"
                          placeholder="عنوان ضمیمه"
                        />
                      </div>
                    </div>
                  </div>

                  {formKind === "outgoing" && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={labelCls.replace("mb-1", "mb-0")}>پیرو</div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {piroIds.map((v, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <select
                              value={v}
                              onChange={(e) => {
                                const nv = e.target.value;
                                setPiroIds((arr) => arr.map((x, i) => (i === idx ? nv : x)));
                              }}
                              className={inputCls + " min-w-[240px] w-[240px]"}
                            >
                              <option value=""></option>
                              {myLetters.map((l) => (
                                <option key={l.id} value={String(l.id)}>
                                  {String(l.letter_no || "")}
                                </option>
                              ))}
                            </select>

                            {idx === piroIds.length - 1 && (
                              <button type="button" onClick={() => setPiroIds((arr) => [...arr, ""])} className={addIconBtnCls} aria-label="افزودن" title="افزودن">
                                <img src="/images/icons/afzodan.svg" alt="" className={addIconImgCls + " dark:invert"} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={labelCls.replace("mb-1", "mb-0")}>بازگشت به</div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {returnToIds.map((v, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <select
                            value={v}
                            onChange={(e) => {
                              const nv = e.target.value;
                              setReturnToIds((arr) => arr.map((x, i) => (i === idx ? nv : x)));
                            }}
                            className={inputCls + " min-w-[240px] w-[240px]"}
                          >
                            <option value=""></option>
                            {myLetters.map((l) => (
                              <option key={l.id} value={String(l.id)}>
                                {String(l.letter_no || "")}
                              </option>
                            ))}
                          </select>

                          {idx === returnToIds.length - 1 && (
                            <button type="button" onClick={() => setReturnToIds((arr) => [...arr, ""])} className={addIconBtnCls} aria-label="افزودن" title="افزودن">
                              <img src="/images/icons/afzodan.svg" alt="" className={addIconImgCls + " dark:invert"} />
                            </button>
                          )}
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => openUpload(formKind)}
                        className={uploadTriggerCls + " min-w-[240px] w-[240px] flex-shrink-0"}
                        aria-label="آپلود و الصاق فایل ها"
                        title="آپلود و الصاق فایل ها"
                      >
                        <img src="/images/icons/upload.svg" alt="" className="w-5 h-5 dark:invert" />
                        <span className="text-sm font-normal">آپلود و الصاق فایل ها</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className={labelCls}>برچسب ها</div>
                  <div className="flex flex-wrap items-center gap-2">
                    {tagCapsFor(formKind === "incoming" ? incomingTagIds : formKind === "outgoing" ? outgoingTagIds : internalTagIds).map((t) => {
                      const id = String(t?.id);
                      const label = String(t?.name || t?.title || t?.label || id || "");
                      const active =
                        formKind === "incoming"
                          ? incomingTagIds.some((x) => String(x) === id)
                          : formKind === "outgoing"
                          ? outgoingTagIds.some((x) => String(x) === id)
                          : internalTagIds.some((x) => String(x) === id);

                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleTagForKind(formKind, id)}
                          className={active ? selectedTagChipCls : chipCls}
                          title={label}
                          aria-label={label}
                        >
                          <span className="truncate max-w-[220px]">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={theme === "dark" ? "my-5 h-px bg-white/10" : "my-5 h-px bg-black/10"} />

                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <div className={labelCls}>تاریخ ثبت دبیرخانه</div>
                      <JalaliPopupDatePicker
                        value={formKind === "incoming" ? incomingSecretariatDate : formKind === "outgoing" ? outgoingSecretariatDate : internalSecretariatDate}
                        onChange={(v) => {
                          if (formKind === "incoming") setIncomingSecretariatDate(v);
                          else if (formKind === "outgoing") setOutgoingSecretariatDate(v);
                          else setInternalSecretariatDate(v);
                        }}
                        theme={theme}
                        hideIcon={true}
                        buttonClassName={secretariatPickerBtnCls(
                          formKind === "incoming" ? incomingSecretariatDate : formKind === "outgoing" ? outgoingSecretariatDate : internalSecretariatDate
                        )}
                      />
                      <div className={theme === "dark" ? "text-white/50 text-[11px] mt-1" : "text-neutral-500 text-[11px] mt-1"}>
                        {secretariatLongText(
                          formKind === "incoming" ? incomingSecretariatDate : formKind === "outgoing" ? outgoingSecretariatDate : internalSecretariatDate
                        )}
                      </div>
                    </div>

                    <div>
                      <div className={labelCls}>شماره ثبت دبیرخانه</div>
                      <input
                        value={formKind === "incoming" ? incomingSecretariatNo : formKind === "outgoing" ? outgoingSecretariatNo : internalSecretariatNo}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (formKind === "incoming") setIncomingSecretariatNo(v);
                          else if (formKind === "outgoing") setOutgoingSecretariatNo(v);
                          else setInternalSecretariatNo(v);
                        }}
                        className={inputCls}
                        type="text"
                      />
                    </div>

                    <div>
                      <div className={labelCls}>نام تحویل گیرنده</div>
                      <input
                        value={formKind === "incoming" ? incomingReceiverName : formKind === "outgoing" ? outgoingReceiverName : internalReceiverName}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (formKind === "incoming") setIncomingReceiverName(v);
                          else if (formKind === "outgoing") setOutgoingReceiverName(v);
                          else setInternalReceiverName(v);
                        }}
                        className={inputCls}
                        type="text"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-2">
                    <button type="button" onClick={submitLetter} className={sendBtnCls} title="ارسال" aria-label="ارسال">
                      <img src="/images/icons/check.svg" alt="" className={sendIconCls} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="mt-5">
            <div className={tableWrapCls}>
              <div className="relative h-[55vh] overflow-auto">
                <table className="w-full text-sm [&_th]:text-center [&_td]:text-center [&_th]:py-0.5 [&_td]:py-0.5" dir="rtl">
                  <thead>
                    <tr className={theadRowCls}>
                      <th className="w-14 !py-2 !text-[14px] md:!text-[15px] !font-semibold sticky top-0 z-40 bg-neutral-200 dark:bg-white/10">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-black dark:accent-neutral-200"
                          checked={allVisibleSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someVisibleSelected;
                          }}
                          onChange={toggleSelectAllVisible}
                          aria-label="انتخاب همه"
                          title="انتخاب همه"
                        />
                      </th>
                      <th className="w-14 !py-2 !text-[14px] md:!text-[15px] !font-semibold sticky top-0 z-30 bg-neutral-200 dark:bg-white/10">دسته بندی</th>
                      <th className="w-14 !py-2 !text-[14px] md:!text-[15px] !font-semibold sticky top-0 z-30 bg-neutral-200 dark:bg-white/10">شماره</th>
                      <th className="w-14 !py-2 !text-[14px] md:!text-[15px] !font-semibold sticky top-0 z-30 bg-neutral-200 dark:bg-white/10">تاریخ</th>
                      <th className="w-14 !py-2 !text-[14px] md:!text-[15px] !font-semibold sticky top-0 z-30 bg-neutral-200 dark:bg-white/10">از/به</th>
                      <th className="w-14 !py-2 !text-[14px] md:!text-[15px] !font-semibold sticky top-0 z-30 bg-neutral-200 dark:bg-white/10">شرکت/سازمان</th>
                      <th className="w-14 !py-2 !text-[14px] md:!text-[15px] !font-semibold sticky top-0 z-30 bg-neutral-200 dark:bg-white/10">موضوع</th>
                      <th className="w-14 !py-2 !text-[14px] md:!text-[15px] !font-semibold sticky top-0 z-30 bg-neutral-200 dark:bg-white/10">اقدامات</th>
                    </tr>
                  </thead>

                  <tbody className={tbodyCls}>
                    {pageItems.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-6 text-black/60 dark:text-neutral-400">
                          آیتمی ثبت نشده است.
                        </td>
                      </tr>
                    ) : (
                      pageItems.map((l, idx) => {
                        const id = String(letterIdOf(l));
                        const kind = letterKindOf(l);
                        const isOutgoing = kind === "outgoing";
                        const isIncoming = kind === "incoming";
                        const isInternal = kind === "internal";
                        const isLast = idx === pageItems.length - 1;
                        const divider = isLast ? "" : rowDividerCls;

                        const rowBg = isOutgoing
                          ? theme === "dark"
                            ? "bg-[#1a7431]/15 hover:bg-[#1a7431]/20"
                            : "bg-[#1a7431]/[0.06] hover:bg-[#1a7431]/[0.09]"
                          : isInternal
                          ? theme === "dark"
                            ? "bg-white/5 hover:bg-white/10"
                            : "bg-black/[0.03] hover:bg-black/[0.05]"
                          : theme === "dark"
                          ? "bg-[#4895ef]/15 hover:bg-[#4895ef]/20"
                          : "bg-[#4895ef]/[0.06] hover:bg-[#4895ef]/[0.09]";

                        return (
                          <tr key={id} className={rowBg + " transition-colors"}>
                            <td className={"px-3 " + divider}>
                              <input
                                type="checkbox"
                                className="w-4 h-4 accent-black dark:accent-neutral-200"
                                checked={selectedIds.has(id)}
                                onChange={() => toggleRowSelect(id)}
                                aria-label="انتخاب"
                                title="انتخاب"
                              />
                            </td>

                            <td className={"px-3 " + divider}>
                              <span
                                className={
                                  "inline-flex items-center gap-2 px-3 h-8 rounded-full text-xs font-semibold border " +
                                  (isOutgoing
                                    ? theme === "dark"
                                      ? "border-[#1a7431]/60 bg-[#1a7431]/25 text-white"
                                      : "border-[#1a7431]/40 bg-white/70 text-[#0e4c1e]"
                                    : isInternal
                                    ? theme === "dark"
                                      ? "border-white/15 bg-white/10 text-white"
                                      : "border-black/15 bg-white text-neutral-900"
                                    : theme === "dark"
                                    ? "border-[#4895ef]/60 bg-[#4895ef]/25 text-white"
                                    : "border-[#4895ef]/40 bg-white/70 text-[#1b4f9b]")
                                }
                              >
                                {categoryLabelOf(l)}
                              </span>
                            </td>

                            <td className={"px-3 " + divider}>
                              <button
                                type="button"
                                onClick={() => openView(l)}
                                className={
                                  "mx-auto inline-flex items-center justify-center gap-2 font-semibold underline-offset-4 hover:underline transition " +
                                  (theme === "dark" ? "text-white" : "text-neutral-900")
                                }
                                title="نمایش"
                                aria-label="نمایش"
                              >
                                {letterNoOf(l) || "—"}
                              </button>
                            </td>

                            <td className={"px-3 " + divider}>{letterDateOf(l) ? toFaDigits(letterDateOf(l)) : "—"}</td>
                            <td className={"px-3 " + divider}>{fromToOf(l)}</td>
                            <td className={"px-3 " + divider}>{orgOf(l) || "—"}</td>
                            <td className={"px-3 " + divider}>
                              <span className="block truncate max-w-[520px] mx-auto">{subjectOf(l) || "—"}</span>
                            </td>

                            <td className={"px-3 " + divider}>
                              <div className="inline-flex items-center justify-center gap-2">
                                <button type="button" onClick={() => openView(l)} className={iconBtnCls} aria-label="نمایش" title="نمایش">
                                  <img src="/images/icons/namayesh.svg" alt="" className="w-5 h-5 dark:invert" />
                                </button>

                                <button type="button" onClick={() => startEdit(l)} className={iconBtnCls} aria-label="ویرایش" title="ویرایش">
                                  <img src="/images/icons/pencil.svg" alt="" className="w-5 h-5 dark:invert" />
                                </button>

                                <button type="button" onClick={() => deleteLetter(id)} className={iconBtnCls} aria-label="حذف" title="حذف">
                                  <img
                                    src="/images/icons/hazf.svg"
                                    alt=""
                                    className="w-5 h-5"
                                    style={{
                                      filter:
                                        "brightness(0) saturate(100%) invert(25%) sepia(95%) saturate(4870%) hue-rotate(355deg) brightness(95%) contrast(110%)",
                                    }}
                                  />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination footer */}
              <div className="border-t border-neutral-300 dark:border-neutral-800 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage <= 0} className={paginationIconBtnCls} aria-label="صفحه قبل" title="صفحه قبل">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>

                    <button type="button" onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={safePage >= pageCount - 1} className={paginationIconBtnCls} aria-label="صفحه بعد" title="صفحه بعد">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>

                    <div className="text-black/70 dark:text-neutral-400 whitespace-nowrap">
                      {total === 0 ? "۰ از ۰" : `${toFaDigits(startIdx + 1)}–${toFaDigits(endIdx)} از ${toFaDigits(total)}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-black/70 dark:text-neutral-400">تعداد در هر صفحه:</span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => {
                        setRowsPerPage(Number(e.target.value) || 10);
                        setPage(0);
                      }}
                      className={"h-9 px-2 rounded-lg border outline-none " + (theme === "dark" ? "border-white/15 bg-white/5 text-white" : "border-black/10 bg-white text-black")}
                    >
                      {[10, 25, 100].map((n) => (
                        <option key={n} value={n}>
                          {toFaDigits(n)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tag Picker modal */}
      {tagPickOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999]">
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={closeTagPicker} />
            <div className="absolute inset-0 p-3 md:p-6 flex items-center justify-center">
              <div
                className={
                  "w-[min(920px,calc(100vw-20px))] h-[min(78vh,720px)] rounded-2xl border shadow-2xl overflow-hidden " +
                  (theme === "dark" ? "border-white/10 bg-neutral-900 text-white" : "border-black/10 bg-white text-neutral-900")
                }
                onClick={(e) => e.stopPropagation()}
              >
                <div className="h-full flex flex-col">
                  <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-black/10 dark:border-white/10">
                    <div className="font-bold text-sm">انتخاب برچسب‌ها</div>

                    <button
                      type="button"
                      onClick={closeTagPicker}
                      className={
                        "h-10 w-10 rounded-xl flex items-center justify-center transition ring-1 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 " +
                        (theme === "dark" ? "ring-neutral-800 hover:bg-white/10 text-white" : "ring-black/15 hover:bg-black/90 bg-black text-white")
                      }
                      aria-label="بستن"
                      title="بستن"
                    >
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {scopes.map((t) => {
                        const active = tagPickTab === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setTagPickTab(t.id)}
                            className={
                              "h-10 px-5 rounded-xl border transition text-sm font-semibold " +
                              (active
                                ? "bg-black text-white border-black"
                                : theme === "dark"
                                ? "bg-transparent text-white border-white/15 hover:bg-white/5"
                                : "bg-white text-neutral-900 border-black/15 hover:bg-black/[0.02]")
                            }
                          >
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto px-4 pb-4">
                    {pickListForTab.length === 0 ? (
                      <div className={theme === "dark" ? "text-white/60 text-sm text-center mt-10" : "text-neutral-600 text-sm text-center mt-10"}>
                        موردی برای نمایش نیست.
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        {pickListForTab.map((t) => {
                          const id = String(t?.id);
                          const label = String(t?.name || t?.title || t?.label || id || "");
                          const active = tagPickTemp.some((x) => String(x) === id);
                          return (
                            <button key={id} type="button" onClick={() => toggleTempTag(id)} className={active ? selectedTagChipCls : chipCls} title={label}>
                              <span className="truncate max-w-[240px]">{label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="px-4 py-3 border-t border-black/10 dark:border-white/10 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFilterTagIds(tagPickTemp.map(String));
                        closeTagPicker();
                      }}
                      className="h-11 px-5 rounded-xl bg-black text-white inline-flex items-center gap-2"
                      aria-label="تایید"
                      title="تایید"
                    >
                      <img src="/images/icons/check.svg" alt="" className="w-5 h-5 invert" />
                      <span className="text-sm font-semibold">تایید</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* View modal */}
      {viewOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999]">
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={closeView} />
            <div className="absolute inset-0 p-3 md:p-6 flex items-center justify-center">
              <div
                className={
                  "w-[min(1200px,calc(100vw-20px))] h-[min(82vh,780px)] rounded-2xl border shadow-2xl overflow-hidden " +
                  (theme === "dark" ? "border-white/10 bg-neutral-900 text-white" : "border-black/10 bg-white text-neutral-900")
                }
                onClick={(e) => e.stopPropagation()}
              >
                <div className="h-full flex flex-col">
                  <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-black/10 dark:border-white/10">
                    <div className="font-bold text-sm">
                      نمایش نامه
                      {viewLetter ? (
                        <span className={theme === "dark" ? "text-white/60 font-normal" : "text-neutral-600 font-normal"}>
                          {" "}
                          — {toFaDigits(letterNoOf(viewLetter) || "")}
                        </span>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={closeView}
                      className={
                        "h-10 w-10 rounded-xl flex items-center justify-center transition ring-1 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 " +
                        (theme === "dark" ? "ring-neutral-800 hover:bg-white/10 text-white" : "ring-black/15 hover:bg-black/90 bg-black text-white")
                      }
                      aria-label="بستن"
                      title="بستن"
                    >
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <div className="h-full flex flex-col lg:flex-row">
                      <div className="lg:w-[56%] h-full overflow-auto p-4">
                        <div className={"rounded-2xl border overflow-hidden " + (theme === "dark" ? "border-white/10 bg-white/5" : "border-black/10 bg-black/[0.02]")}>
                          <div className={"px-4 py-3 text-sm font-semibold border-b " + (theme === "dark" ? "border-white/10 bg-white/5" : "border-black/10 bg-white")}>
                            مشخصات نامه
                          </div>

                          <div className="px-4 divide-y divide-black/10 dark:divide-white/10">
                            <InfoRow label="نوع" value={viewLetter ? kindLabel(letterKindOf(viewLetter)) : ""} />
                            <InfoRow label="دسته بندی" value={viewLetter ? categoryLabel(categoryOf(viewLetter)) : ""} />

                            <InfoRow
                              label="پروژه"
                              value={
                                viewLetter && (viewLetter?.project_id ?? viewLetter?.projectId)
                                  ? (() => {
                                      const pid = String(viewLetter?.project_id ?? viewLetter?.projectId);
                                      const p = findProject(pid);
                                      if (!p) return pid;
                                      return `${String(p.code || "")}${p.name ? ` - ${p.name}` : ""}`.trim();
                                    })()
                                  : "—"
                              }
                            />

                            <div className="py-2">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="grid grid-cols-12 gap-2">
                                  <div className={"col-span-4 text-xs font-semibold " + (theme === "dark" ? "text-white/70" : "text-neutral-600")}>شماره</div>
                                  <div className={"col-span-8 text-sm " + (theme === "dark" ? "text-white" : "text-neutral-900")}>
                                    {viewLetter ? toFaDigits(letterNoOf(viewLetter) || "") : "—"}
                                  </div>
                                </div>

                                <div className="grid grid-cols-12 gap-2">
                                  <div className={"col-span-4 text-xs font-semibold " + (theme === "dark" ? "text-white/70" : "text-neutral-600")}>تاریخ</div>
                                  <div className={"col-span-8 text-sm " + (theme === "dark" ? "text-white" : "text-neutral-900")}>
                                    {viewLetter ? toFaDigits(letterDateOf(viewLetter) || "") : "—"}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <InfoRow label="از / به" value={viewLetter ? fromToOf(viewLetter) : "—"} />
                            <InfoRow label="شرکت/سازمان" value={viewLetter ? String(viewLetter?.org_name ?? viewLetter?.orgName ?? viewLetter?.org ?? "") : ""} />
                            <InfoRow label="موضوع" value={viewLetter ? String(subjectOf(viewLetter) || "") : ""} />

                            <InfoRow label="ضمیمه" value={viewHasAttachment ? "دارد" : "ندارد"} />
                            <InfoRow label="عنوان ضمیمه" value={viewLetter ? String(viewLetter?.attachment_title ?? viewLetter?.attachmentTitle ?? "") : ""} />

                            <InfoRow label="تاریخ ثبت دبیرخانه" value={viewLetter ? toFaDigits(String(viewLetter?.secretariat_date ?? viewLetter?.secretariatDate ?? "")) : ""} />
                            <InfoRow label="شماره ثبت دبیرخانه" value={viewLetter ? String(viewLetter?.secretariat_no ?? viewLetter?.secretariatNo ?? "") : ""} />
                            <InfoRow label="نام تحویل گیرنده" value={viewLetter ? String(viewLetter?.receiver_name ?? viewLetter?.receiverName ?? "") : ""} />
                          </div>
                        </div>

                        {viewAttachments.length > 1 && (
                          <div className="mt-3">
                            <div className={labelCls}>فایل‌ها</div>
                            <div className="flex flex-wrap gap-2">
                              {viewAttachments.map((a, i) => {
                                const u = attachmentUrlOf(a);
                                const n = attachmentNameOf(a) || `فایل ${i + 1}`;
                                const active = (viewAttIdx || 0) === i;
                                return (
                                  <button
                                    key={String(i)}
                                    type="button"
                                    onClick={() => setViewAttIdx(i)}
                                    className={
                                      "h-10 px-3 rounded-xl border transition text-sm " +
                                      (active
                                        ? theme === "dark"
                                          ? "border-white/15 bg-white text-black"
                                          : "border-black/15 bg-black text-white"
                                        : theme === "dark"
                                        ? "border-white/15 bg-white/5 text-white hover:bg-white/10"
                                        : "border-black/10 bg-white text-neutral-900 hover:bg-black/[0.02]")
                                    }
                                    title={u || ""}
                                  >
                                    {n}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="lg:w-[44%] h-full border-t lg:border-t-0 lg:border-r border-black/10 dark:border-white/10 overflow-hidden">
                        <div className="h-full flex flex-col">
                          <div className="px-4 py-3 flex items-center justify-between gap-2 border-b border-black/10 dark:border-white/10">
                            <div className="text-sm font-semibold">پیش نمایش</div>
                          </div>

                          <div className="flex-1 p-3 overflow-hidden flex flex-col">
                            <div className={"flex-1 rounded-2xl border overflow-hidden " + (theme === "dark" ? "border-white/10 bg-white/5" : "border-black/10 bg-black/[0.02]")}>
                              {currentViewUrl ? (
                                isPdfUrl(currentViewUrl) ? (
                                  <iframe title="preview" src={currentViewUrl} className="w-full h-full" />
                                ) : isImageUrl(currentViewUrl) ? (
                                  <img src={currentViewUrl} alt="" className="w-full h-full object-contain bg-transparent" />
                                ) : (
                                  <div className="h-full w-full grid place-items-center p-6">
                                    <div className={theme === "dark" ? "text-white/70 text-sm" : "text-neutral-700 text-sm"}>امکان پیش نمایش این نوع فایل نیست.</div>
                                  </div>
                                )
                              ) : (
                                <div className="h-full w-full grid place-items-center p-6">
                                  <div className={theme === "dark" ? "text-white/60 text-sm" : "text-neutral-600 text-sm"}>فایلی برای پیش نمایش موجود نیست.</div>
                                </div>
                              )}
                            </div>

                            <div className="mt-2 flex flex-col gap-1">
                              <a
                                href={currentViewUrl || "#"}
                                target="_blank"
                                rel="noreferrer"
                                download
                                className={
                                  "h-11 rounded-xl inline-flex items-center justify-center gap-2 transition " +
                                  (currentViewUrl
                                    ? theme === "dark"
                                      ? "bg-white text-black hover:bg-white/90"
                                      : "bg-black text-white hover:bg-black/90"
                                    : theme === "dark"
                                    ? "bg-white/10 text-white/40 pointer-events-none"
                                    : "bg-black/10 text-black/40 pointer-events-none")
                                }
                                title="دانلود فایل"
                                aria-label="دانلود فایل"
                              >
                                <img src="/images/icons/download.svg" alt="" className={"w-5 h-5 " + (theme === "dark" ? "" : "invert")} />
                                <span className="text-sm font-semibold">دانلود فایل</span>
                              </a>

                              {currentViewName ? (
                                <div className={theme === "dark" ? "text-[11px] text-white/60 text-center" : "text-[11px] text-neutral-600 text-center"}>{currentViewName}</div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* /preview */}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Upload modal */}
      {uploadOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999]">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeUpload} />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div
                className={
                  "w-[min(860px,calc(100vw-24px))] rounded-2xl border shadow-xl overflow-hidden " +
                  (theme === "dark" ? "border-white/10 bg-neutral-900 text-white" : "border-black/10 bg-white text-neutral-900")
                }
              >
                <div className="p-4 flex items-center justify-between">
                  <div className="font-bold text-sm">بارگذاری نامه ({kindLabel(uploadFor)})</div>
                  <button
                    type="button"
                    onClick={closeUpload}
                    className={
                      "h-10 w-10 rounded-xl flex items-center justify-center transition ring-1 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 " +
                      (theme === "dark" ? "ring-neutral-800 hover:bg-white/10 text-white" : "ring-black/15 hover:bg-black/90 bg-black text-white")
                    }
                    aria-label="بستن"
                    title="بستن"
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className={theme === "dark" ? "h-px bg-white/10" : "h-px bg-black/10"} />

                <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Existing uploaded files */}
                  <div className={"rounded-2xl border overflow-hidden " + (theme === "dark" ? "border-white/10 bg-white/5" : "border-black/10 bg-black/[0.02]")}>
                    <div className={"px-4 py-3 text-sm font-semibold border-b " + (theme === "dark" ? "border-white/10 bg-white/5" : "border-black/10 bg-white")}>فایل‌های آپلود شده</div>
                    <div className="p-4">
                      <input value={pickSearch} onChange={(e) => setPickSearch(e.target.value)} className={inputCls} type="text" placeholder="جستجو..." />

                      <div className="mt-3 max-h-[44vh] overflow-auto pr-1">
                        {filteredUploadedAttachments.length === 0 ? (
                          <div className={theme === "dark" ? "text-white/60 text-sm text-center py-8" : "text-neutral-600 text-sm text-center py-8"}>فایلی پیدا نشد.</div>
                        ) : (
                          <div className="space-y-2">
                            {filteredUploadedAttachments.map((a, idx) => {
                              const url = attachmentUrlOf(a);
                              const name = attachmentNameOf(a) || a?.name || `فایل ${idx + 1}`;
                              const size = attachmentSizeOf(a);
                              const isPdf = isPdfUrl(url);
                              const isImg = isImageUrl(url);
                              return (
                                <div
                                  key={String(url || idx)}
                                  className={
                                    "rounded-xl border p-2 flex items-center justify-between gap-2 " +
                                    (theme === "dark" ? "border-white/10 bg-white/5" : "border-black/10 bg-white")
                                  }
                                >
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold truncate">{name}</div>
                                    <div className={theme === "dark" ? "text-[11px] text-white/60" : "text-[11px] text-neutral-500"}>
                                      {size ? `${toFaDigits(size)} بایت` : ""} {a?._letterNo ? `— نامه: ${toFaDigits(String(a._letterNo))}` : ""}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <a
                                      href={url || "#"}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={
                                        "h-10 px-3 rounded-xl border text-sm font-semibold transition inline-flex items-center gap-2 " +
                                        (theme === "dark"
                                          ? "border-white/15 bg-white/5 text-white hover:bg-white/10"
                                          : "border-black/10 bg-white text-neutral-900 hover:bg-black/[0.02]")
                                      }
                                      title="باز کردن"
                                    >
                                      <span>باز کردن</span>
                                      <img src={isPdf ? "/images/icons/pdf.svg" : isImg ? "/images/icons/image.svg" : "/images/icons/namayesh.svg"} alt="" className="w-5 h-5 dark:invert" />
                                    </a>

                                    <button
                                      type="button"
                                      onClick={() => addExistingAttachmentToCurrent(uploadFor, a)}
                                      className="h-10 px-3 rounded-xl bg-black text-white text-sm font-semibold inline-flex items-center gap-2"
                                      title="افزودن"
                                    >
                                      <span>افزودن</span>
                                      <img src="/images/icons/check.svg" alt="" className="w-5 h-5 invert" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Upload new + current selected */}
                  <div className={"rounded-2xl border overflow-hidden " + (theme === "dark" ? "border-white/10 bg-white/5" : "border-black/10 bg-black/[0.02]")}>
                    <div className={"px-4 py-3 text-sm font-semibold border-b " + (theme === "dark" ? "border-white/10 bg-white/5" : "border-black/10 bg-white")}>افزودن فایل جدید</div>

                    <div className="p-4">
                      <div
                        onDrop={onDropUpload}
                        onDragOver={onDragOverUpload}
                        className={
                          "rounded-2xl border border-dashed p-4 text-center transition cursor-pointer " +
                          (theme === "dark" ? "border-white/15 bg-white/5 hover:bg-white/10" : "border-black/15 bg-black/[0.02] hover:bg-black/[0.04]")
                        }
                        onClick={() => {
                          const el = document.getElementById("letters_upload_input");
                          if (el) el.click();
                        }}
                      >
                        <div className={theme === "dark" ? "text-white/80 text-sm font-semibold" : "text-neutral-800 text-sm font-semibold"}>فایل را اینجا رها کنید</div>
                        <div className={theme === "dark" ? "text-white/60 text-xs mt-1" : "text-neutral-600 text-xs mt-1"}>یا کلیک کنید تا انتخاب شود (تصویر / PDF)</div>
                      </div>

                      <input
                        id="letters_upload_input"
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => addFilesToUpload(uploadFor, e.target.files)}
                        accept="image/*,application/pdf"
                      />

                      <div className="mt-3">
                        <div className={labelCls}>فایل‌های انتخاب شده</div>
                        <div className="space-y-2">
                          {currentDocFiles.length === 0 ? (
                            <div className={theme === "dark" ? "text-white/60 text-sm" : "text-neutral-600 text-sm"}>فایلی انتخاب نشده است.</div>
                          ) : (
                            currentDocFiles.map((f) => (
                              <div
                                key={f.id}
                                className={
                                  "rounded-xl border p-2 flex items-center justify-between gap-2 " +
                                  (theme === "dark" ? "border-white/10 bg-white/5" : "border-black/10 bg-white")
                                }
                              >
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold truncate">{f.name}</div>
                                  <div className={theme === "dark" ? "text-[11px] text-white/60" : "text-[11px] text-neutral-500"}>
                                    {f.size ? `${toFaDigits(f.size)} بایت` : ""}{" "}
                                    {f.status === "uploading" ? `— در حال آپلود: ${toFaDigits(f.progress || 0)}٪` : ""}
                                    {f.status === "done" ? "— آماده" : ""}
                                    {f.status === "error" ? `— ${f.error || "خطا"}` : ""}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {f.url ? (
                                    <a
                                      href={f.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={
                                        "h-10 px-3 rounded-xl border text-sm font-semibold transition inline-flex items-center gap-2 " +
                                        (theme === "dark"
                                          ? "border-white/15 bg-white/5 text-white hover:bg-white/10"
                                          : "border-black/10 bg-white text-neutral-900 hover:bg-black/[0.02]")
                                      }
                                      title="باز کردن"
                                    >
                                      <span>باز کردن</span>
                                      <img src="/images/icons/namayesh.svg" alt="" className="w-5 h-5 dark:invert" />
                                    </a>
                                  ) : null}

                                  <button type="button" onClick={() => removeDocFile(uploadFor, f.id)} className={iconBtnCls} title="حذف" aria-label="حذف">
                                    <img
                                      src="/images/icons/hazf.svg"
                                      alt=""
                                      className="w-5 h-5"
                                      style={{
                                        filter:
                                          "brightness(0) saturate(100%) invert(25%) sepia(95%) saturate(4870%) hue-rotate(355deg) brightness(95%) contrast(110%)",
                                      }}
                                    />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-end">
                        <button type="button" onClick={closeUpload} className="h-11 px-5 rounded-xl bg-black text-white font-semibold">
                          انجام شد
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
