// براورد درامد ها
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';

import { Card } from '../components/ui/Card';
import { TableWrap, THead, TR, TH, TD } from '../components/ui/Table';
import { usePageAccess } from '../hooks/usePageAccess';

const PAGE_KEY = 'RevenueEstimatesPage';

function RevenueEstimatesPage() {
  const formatMoney = (n) => {
    const s = String(n ?? '');
    if (s === '') return '';
    const sign = Number(n) < 0 ? '-' : '';
    const digits = String(Math.abs(Number(n) || 0));
    return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const toFaDigits = (s) =>
    String(s ?? '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

  const toEnDigits = (s) =>
    String(s || '')
      .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
      .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));

  const parseMoney = (s) => {
    if (s == null) return 0;
    const sign = /^\s*-/.test(String(s)) ? -1 : 1;
    const d = toEnDigits(String(s)).replace(/[^\d]/g, '');
    if (!d) return 0;
    return sign * parseInt(d, 10);
  };

  const api = async (path, opt = {}) => {
    const res = await fetch('/api' + path, {
      credentials: 'include',
      ...opt,
      headers: {
        'Content-Type': 'application/json',
        ...(opt.headers || {}),
      },
    });
    const txt = await res.text();
    let data = {};
    try {
      data = txt ? JSON.parse(txt) : {};
    } catch {}
    if (!res.ok) throw new Error(data?.error || data?.message || 'request_failed');
    return data;
  };

  // ===== Access (مثل همون الگو) =====
  const { me, loading: accessLoading, canAccessPage } = usePageAccess(PAGE_KEY);

  const monthNames = [
    'فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور',
    'مهر','آبان','آذر','دی','بهمن','اسفند',
  ];

  const jalaliMonthIndex = useMemo(() => {
    try {
      const fmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'numeric' });
      const fa = fmt.format(new Date());
      const en = Number(toEnDigits(fa));
      if (!en || en < 1 || en > 12) return new Date().getMonth() + 1;
      return en;
    } catch {
      return new Date().getMonth() + 1;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dynamicMonths = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 6; i++) {
      const m = ((jalaliMonthIndex + i - 1) % 12) + 1;
      arr.push({ key: 'm' + m, monthIndex: m, label: monthNames[m - 1] });
    }
    return arr;
  }, [jalaliMonthIndex]);

  const [allRows, setAllRows] = useState([]);
  const rowIdRef = useRef(1);

  const makeNode = (p) => ({
    id: p.id,
    title: p.title || '',
    desc: p.desc || '',
    projectId: p.projectId || null,
    months: p.months || {},
    children: p.children || [],
    expanded: !!p.expanded,
    isOther: !!p.isOther,
    otherUid: p.otherUid || null,
  });

  const hasChildren = (node) => (node?.children || []).length > 0;

  const sumNodeMonth = useCallback(
    (node, monthKey) => {
      if (!node) return 0;
      if (hasChildren(node)) {
        return (node.children || []).reduce((acc, ch) => acc + sumNodeMonth(ch, monthKey), 0);
      }
      return Number(node.months?.[monthKey] || 0);
    },
    []
  );

  const sumNodeMonths = useCallback(
    (node) => dynamicMonths.reduce((acc, m) => acc + sumNodeMonth(node, m.key), 0),
    [dynamicMonths, sumNodeMonth]
  );

  const [projects, setProjects] = useState([]);

  useEffect(() => {
    if (canAccessPage !== true) return;
    (async () => {
      try {
        const data = await api('/projects');
        setProjects(data.projects || data.items || []);
      } catch (e) {
        console.error('load projects failed', e);
      }
    })();
  }, [canAccessPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const projectById = useMemo(() => {
    const m = new Map();
    (projects || []).forEach((p) => {
      const id = p?.id;
      if (id != null) m.set(String(id), p);
    });
    return m;
  }, [projects]);

  const getProjectLabel = useCallback((p) => {
    const code = String(p?.code ?? p?.project_code ?? p?.projectCode ?? '').trim();
    const name = String(p?.name ?? p?.title ?? p?.project_name ?? p?.project ?? '').trim();
    if (code && name) return `${code} - ${name}`;
    return code || name || 'پروژه بدون نام';
  }, []);

  const getProjectLabelById = useCallback(
    (pid, fallback = '') => {
      const p = projectById.get(String(pid));
      return p ? getProjectLabel(p) : (fallback || '—');
    },
    [projectById, getProjectLabel]
  );

  const SEP = ' › ';

  // ===== UID helpers for "سایر" (پایداری بعد از رفرش) =====
  const OTHER_UID_RE = /^\[\[OID:([^\]]+)\]\]\s*/;

  const stripOtherUid = (s) => String(s || '').replace(OTHER_UID_RE, '').trim();
  const parseOtherSeg0 = (seg0) => {
    const raw = String(seg0 || '').trim();
    const m = raw.match(OTHER_UID_RE);
    if (!m) return { uid: null, title: raw };
    return { uid: String(m[1] || '').trim() || null, title: stripOtherUid(raw) };
  };

  const genUid = () => {
    try {
      return (
        Date.now().toString(36) +
        '-' +
        Math.random().toString(36).slice(2, 10)
      ).toUpperCase();
    } catch {
      return String(Date.now());
    }
  };

  // ===== انتخاب‌ها (کپسول‌ها) =====
  const [poolProjectIds, setPoolProjectIds] = useState([]); // پروژه‌هایی که به کپسول‌ها اضافه شده‌اند
  const [poolOtherIds, setPoolOtherIds] = useState([]);     // سایرها (UID پایدار)
  const [selectedKeysArr, setSelectedKeysArr] = useState([]); // انتخاب‌های فعال برای نمایش در جدول اصلی

  const projectKey = (pid) => `p:${String(pid)}`;
  const otherKey = (oid) => `o:${String(oid)}`;

  const selectedKeys = useMemo(() => new Set(selectedKeysArr), [selectedKeysArr]);

  const poolKeys = useMemo(() => {
    const out = [];
    (poolProjectIds || []).forEach((pid) => out.push(projectKey(pid)));
    (poolOtherIds || []).forEach((oid) => out.push(otherKey(oid)));
    return out;
  }, [poolProjectIds, poolOtherIds]);

  const isAllSelected = useMemo(() => {
    if (!poolKeys.length) return false;
    for (const k of poolKeys) if (!selectedKeys.has(k)) return false;
    return true;
  }, [poolKeys, selectedKeys]);

  const ensureRootForProject = useCallback((pid) => {
    const spid = String(pid);
    const p = projectById.get(spid);
    const title = p ? getProjectLabel(p) : 'پروژه';
    return makeNode({
      id: rowIdRef.current++,
      title,
      desc: '',
      projectId: Number(spid),
      months: {},
      children: [],
      expanded: true,
      isOther: false,
    });
  }, [projectById, getProjectLabel]);

  const ensureRootForOther = useCallback((uid, title) => {
    return makeNode({
      id: rowIdRef.current++,
      title: title || 'سایر',
      desc: '',
      projectId: null,
      months: {},
      children: [],
      expanded: true,
      isOther: true,
      otherUid: uid || genUid(),
    });
  }, []);

  const visibleRoots = useMemo(() => {
    const keys = selectedKeys;
    return (allRows || []).filter((r) => {
      const k = r?.projectId != null ? projectKey(r.projectId) : otherKey(r.otherUid || r.id);
      return keys.has(k);
    });
  }, [allRows, selectedKeys]);

  const totalsByMonth = useMemo(() => {
    const totals = {};
    dynamicMonths.forEach((m) => (totals[m.key] = 0));
    visibleRoots.forEach((r) => {
      dynamicMonths.forEach((m) => {
        totals[m.key] += sumNodeMonth(r, m.key);
      });
    });
    return totals;
  }, [visibleRoots, dynamicMonths, sumNodeMonth]);

  const totalGrand = useMemo(
    () => visibleRoots.reduce((acc, r) => acc + sumNodeMonths(r), 0),
    [visibleRoots, sumNodeMonths]
  );

  // ===== Load existing data =====
  const buildTreeFromItems = useCallback(
    (items) => {
      const rootMap = new Map();

      const getOrCreateChild = (parent, seg) => {
        const segClean = String(seg || '').trim();
        if (!segClean) return parent;
        const arr = parent.children || [];
        let found = arr.find((x) => x.title === segClean);
        if (!found) {
          found = makeNode({
            id: rowIdRef.current++,
            title: segClean,
            desc: '',
            projectId: parent.projectId,
            months: {},
            children: [],
            expanded: false,
          });
          parent.children = [...arr, found];
        }
        return found;
      };

      const ensureRoot = (seg0, projectId, isOther, otherUid) => {
        const key =
          (projectId != null ? String(projectId) : 'null') +
          '::' +
          String(seg0) +
          '::' +
          String(otherUid || '');
        if (!rootMap.has(key)) {
          rootMap.set(
            key,
            makeNode({
              id: rowIdRef.current++,
              title: String(seg0 || '').trim(),
              desc: '',
              projectId: projectId != null ? projectId : null,
              months: {},
              children: [],
              expanded: false,
              isOther: !!isOther,
              otherUid: otherUid || null,
            })
          );
        }
        return rootMap.get(key);
      };

      items.forEach((it, idx) => {
        const projectId = it.project_id ?? null;
        const isOther = it.is_other === true || it.isOther === true;

        let rawTitle = String(it.title || '').trim();

        // اگر عنوان خالی بود و "سایر" است، به‌جای R1/R2 یک عنوان صحیح بساز
        if (!rawTitle && isOther) {
          const ri = Number(it.row_index || (idx + 1)) || (idx + 1);
          rawTitle = `سایر ${ri}`;
        }

        if (!rawTitle) return;

        const partsRaw = rawTitle.split(SEP).map((x) => x.trim()).filter(Boolean);
        if (!partsRaw.length) return;

        // بخش اول می‌تواند UID مخفی داشته باشد
        const p0 = parseOtherSeg0(partsRaw[0]);
        const seg0 = p0.title || partsRaw[0];
        const otherUid = isOther ? (p0.uid || null) : null;

        const monthsMap = {};
        (it.months || []).forEach((m) => {
          if (m && m.key) monthsMap[m.key] = Number(m.amount || 0);
        });

        const root = ensureRoot(seg0, projectId, isOther, otherUid);

        let node = root;
        for (let i = 1; i < partsRaw.length; i++) {
          node = getOrCreateChild(node, partsRaw[i]);
        }

        node.desc = String(it.description || '');
        node.projectId = projectId != null ? projectId : node.projectId || null;
        node.months = monthsMap;
      });

      return Array.from(rootMap.values());
    },
    []
  );

  // ===== Auto Save (فقط برای تغییرات داده‌ای) =====
  const saveTimerRef = useRef(null);
  const savingRef = useRef(false);
  const pendingRowsRef = useRef(null);
  const lastSavedRef = useRef('');

  const saveRowsToServer = useCallback(
    async (rowsArg) => {
      const flatten = [];

      const encodeTitleSeg = (node, seg, isRoot) => {
        if (isRoot && node?.isOther && node?.otherUid) {
          return `[[OID:${node.otherUid}]] ${seg || 'سایر'}`.trim();
        }
        return seg || '';
      };

      const buildTitlePath = (prefix, node, isRoot) => {
        const seg = encodeTitleSeg(node, node.title, isRoot);
        return prefix ? prefix + SEP + seg : seg;
      };

      const walk = (node, prefix, isRoot) => {
        const titlePath = buildTitlePath(prefix, node, isRoot);

        // اگر به هر دلیل عنوان خالی شد، ارسال نکن
        if (!String(titlePath || '').trim()) return;

        const months = dynamicMonths.map((m) => ({
          key: m.key,
          month_index: m.monthIndex,
          label: m.label,
          amount: hasChildren(node) ? sumNodeMonth(node, m.key) : Number(node.months?.[m.key] || 0),
        }));
        const total = months.reduce((acc, mm) => acc + (mm.amount || 0), 0);

        flatten.push({
          title: titlePath,
          description: node.desc || '',
          project_id: node.projectId || null,
          is_other: !!node.isOther,
          months,
          amount: total,
        });

        (node.children || []).forEach((ch) => walk(ch, titlePath, false));
      };

      (rowsArg || []).forEach((r) => walk(r, '', true));

      const payloadRows = flatten.map((r, idx) => ({
        code: 'R' + (idx + 1),
        row_index: idx + 1,
        title: r.title,
        description: r.description,
        project_id: r.project_id,
        is_other: r.is_other,
        months: r.months,
        amount: r.amount,
      }));

      const sig = JSON.stringify(payloadRows);
      if (sig === lastSavedRef.current) return;

      await api('/revenue-estimates', {
        method: 'POST',
        body: JSON.stringify({ rows: payloadRows }),
      });

      lastSavedRef.current = sig;
    },
    [api, dynamicMonths, hasChildren, sumNodeMonth]
  );

  const scheduleSave = useCallback(
    (nextRows, delay = 250) => {
      if (canAccessPage !== true) return;
      pendingRowsRef.current = nextRows;

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        if (savingRef.current) return;
        savingRef.current = true;
        try {
          await saveRowsToServer(pendingRowsRef.current || []);
        } catch (e) {
          console.error('auto save revenue estimates failed', e);
        } finally {
          savingRef.current = false;
        }
      }, delay);
    },
    [canAccessPage, saveRowsToServer]
  );

  const handleSave = async () => {
    try {
      await saveRowsToServer(allRows || []);
      alert('برآورد درآمد با موفقیت ذخیره شد.');
    } catch (e) {
      console.error('save revenue estimates failed', e);
      alert('ذخیره برآورد با خطا مواجه شد.');
    }
  };

  // ===== UI state persist (همون لحظه) =====
  const persistKey = useMemo(() => {
    const uid = me?.id != null ? String(me.id) : (me?.username ? String(me.username) : 'anon');
    return `RevenueEstimatesPage:UI:${uid}`;
  }, [me]);

  const readPersistedUI = useCallback(() => {
    try {
      const raw = localStorage.getItem(persistKey);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object') return null;
      return obj;
    } catch {
      return null;
    }
  }, [persistKey]);

  useEffect(() => {
    if (!persistKey) return;
    try {
      localStorage.setItem(
        persistKey,
        JSON.stringify({
          poolProjectIds: poolProjectIds || [],
          poolOtherIds: poolOtherIds || [],
          selectedKeysArr: selectedKeysArr || [],
        })
      );
    } catch {}
  }, [persistKey, poolProjectIds, poolOtherIds, selectedKeysArr]);

  // ===== Load from server =====
  const didInitUIRef = useRef(false);

  useEffect(() => {
    if (canAccessPage !== true) return;
    (async () => {
      try {
        const data = await api('/revenue-estimates');
        const items = data.items || [];

        items.sort((a, b) => (a.row_index || 0) - (b.row_index || 0));

        rowIdRef.current = 1;
        const tree = buildTreeFromItems(items);
        setAllRows(tree);

        // استخراج ریشه‌ها
        const derivedPids = [];
        const derivedOtherUids = [];

        const patchedTree = (tree || []).map((r) => {
          if (r?.projectId != null) {
            derivedPids.push(String(r.projectId));
            return r;
          }
          if (r?.isOther) {
            // اگر UID نداشت، همینجا ایجاد کنیم و سریع ذخیره شود تا پایدار شود
            const uid = r.otherUid || genUid();
            if (!r.otherUid) {
              const baseTitle = stripOtherUid(r.title) || 'سایر';
              return { ...r, otherUid: uid, title: baseTitle };
            }
            derivedOtherUids.push(String(uid));
            return r;
          }
          return r;
        });

        // اگر UID جدید ساختیم، به لیست‌ها هم اضافه کنیم + ذخیره
        const normalizedTree = patchedTree.map((r) => {
          if (r?.isOther) derivedOtherUids.push(String(r.otherUid || ''));
          return r;
        }).filter(Boolean);

        setAllRows(normalizedTree);

        const uniqP = Array.from(new Set(derivedPids.filter(Boolean)));
        const uniqO = Array.from(new Set(derivedOtherUids.filter(Boolean)));

        const persisted = readPersistedUI();

        // pool ها
        const pPool = persisted?.poolProjectIds ? Array.from(new Set([...(persisted.poolProjectIds || []), ...uniqP])) : uniqP;
        const oPool = persisted?.poolOtherIds ? Array.from(new Set([...(persisted.poolOtherIds || []), ...uniqO])) : uniqO;

        setPoolProjectIds(pPool);
        setPoolOtherIds(oPool);

        // selected ها
        const poolK = [
          ...pPool.map((pid) => projectKey(pid)),
          ...oPool.map((oid) => otherKey(oid)),
        ];

        let nextSelected = [];
        if (persisted?.selectedKeysArr && Array.isArray(persisted.selectedKeysArr)) {
          const s = new Set(persisted.selectedKeysArr);
          nextSelected = poolK.filter((k) => s.has(k));
        } else {
          // پیش‌فرض: همه موارد موجود نمایش داده شوند
          nextSelected = poolK;
        }

        setSelectedKeysArr(nextSelected);

        // اگر UID جدید ساخته شده بود و در title ذخیره نشده بود، یک‌بار ذخیره کن
        const hasAnyNewUid = (normalizedTree || []).some((r) => r?.isOther && r?.otherUid && !String(items?.[0]?.title || '').includes(`[[OID:`));
        if (hasAnyNewUid) {
          scheduleSave(normalizedTree, 150);
        }

        didInitUIRef.current = true;
      } catch (e) {
        console.error('load revenue estimates failed', e);
      }
    })();
  }, [buildTreeFromItems, canAccessPage, readPersistedUI]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== ابزارهای انتخاب/نمایش =====
  const addToSelected = (k) => {
    setSelectedKeysArr((prev) => {
      const s = new Set(prev);
      s.add(k);
      return Array.from(s);
    });
  };

  const removeFromSelected = (k) => {
    setSelectedKeysArr((prev) => prev.filter((x) => x !== k));
  };

  const toggleSelected = (k) => {
    setSelectedKeysArr((prev) => {
      const s = new Set(prev);
      if (s.has(k)) s.delete(k);
      else s.add(k);
      return Array.from(s);
    });
  };

  const toggleSelectAll = () => {
    if (!poolKeys.length) return;
    if (isAllSelected) setSelectedKeysArr([]);
    else setSelectedKeysArr(poolKeys);
  };

  // ===== افزودن پروژه به کپسول‌ها (بدون ورود مستقیم به جدول اصلی) =====
  const [pickedProjectId, setPickedProjectId] = useState('');

  const addPickedProject = () => {
    const pid = String(pickedProjectId || '');
    if (!pid) return;

    if (pid === '__ALL__') {
      const all = (projects || []).map((p) => String(p?.id ?? '')).filter(Boolean);
      setPoolProjectIds((prev) => Array.from(new Set([...(prev || []), ...all])));
      setPickedProjectId('');
      return;
    }

    const exists = (poolProjectIds || []).includes(pid);
    if (exists) {
      setPickedProjectId('');
      return;
    }
    setPoolProjectIds((prev) => [...(prev || []), pid]);
    setPickedProjectId('');
  };

  // ===== اضافه کردن "سایر" (هر کلیک = یک آیتم جدید) =====
  const addOtherChip = () => {
    const uid = genUid();
    const idx = (poolOtherIds || []).length + 1;
    const title = `سایر ${toFaDigits(idx)}`;

    const newRoot = ensureRootForOther(uid, title);

    setAllRows((prev) => {
      const next = [...(prev || []), newRoot];
      scheduleSave(next, 120);
      return next;
    });

    setPoolOtherIds((prev) => [...(prev || []), uid]);
    addToSelected(otherKey(uid));
  };

  // ===== کلیک روی کپسول‌ها: اضافه/کم کردن از جدول اصلی =====
  const onToggleProjectChip = (pid) => {
    const k = projectKey(pid);
    const isOn = selectedKeys.has(k);

    if (!isOn) {
      // اگر هنوز دیتا برای این پروژه نداریم، بسازیم (برای نمایش/ویرایش)
      setAllRows((prev) => {
        const exists = (prev || []).some((r) => String(r?.projectId) === String(pid));
        if (exists) return prev;
        const next = [...(prev || []), ensureRootForProject(pid)];
        scheduleSave(next, 180);
        return next;
      });
    }

    toggleSelected(k);
  };

  const onToggleOtherChip = (oid) => {
    const k = otherKey(oid);
    toggleSelected(k);
  };

  // ===== حذف کپسول‌ها (واقعاً از جدول/دیتا حذف شود) =====
  const removeProjectChipHard = (pid) => {
    const spid = String(pid);
    setPoolProjectIds((prev) => (prev || []).filter((x) => String(x) !== spid));
    removeFromSelected(projectKey(spid));
    setAllRows((prev) => {
      const next = (prev || []).filter((r) => String(r?.projectId ?? '') !== spid);
      scheduleSave(next, 120);
      return next;
    });
    if (String(pickedProjectId || '') === spid) setPickedProjectId('');
  };

  const removeOtherChipHard = (oid) => {
    const soid = String(oid);
    setPoolOtherIds((prev) => (prev || []).filter((x) => String(x) !== soid));
    removeFromSelected(otherKey(soid));
    setAllRows((prev) => {
      const next = (prev || []).filter((r) => String(r?.otherUid || '') !== soid);
      scheduleSave(next, 120);
      return next;
    });
  };

  // ===== Tree ops (فقط روی allRows) =====
  const [childModal, setChildModal] = useState({ open: false, parentId: null, title: '', desc: '' });

  const openChildModal = (parentId) => {
    setChildModal({ open: true, parentId, title: '', desc: '' });
  };

  const closeChildModal = () => setChildModal((prev) => ({ ...prev, open: false }));

  const addChildToTree = useCallback((tree, parentId, child) => {
    const rec = (nodes) =>
      nodes.map((n) => {
        if (n.id === parentId) {
          const nextChildren = [...(n.children || []), child];
          return { ...n, children: nextChildren, expanded: true };
        }
        if (n.children?.length) return { ...n, children: rec(n.children) };
        return n;
      });
    return rec(tree);
  }, []);

  const handleChildSave = () => {
    const title = childModal.title.trim();
    const desc = childModal.desc.trim();
    if (!title || !childModal.parentId) {
      closeChildModal();
      return;
    }

    const id = rowIdRef.current++;
    const newChild = makeNode({
      id,
      title,
      desc,
      projectId: null,
      months: {},
      children: [],
      expanded: false,
    });

    const findProjectId = (nodes, pid) => {
      for (const n of nodes) {
        if (n.id === pid) return n.projectId || null;
        if (n.children?.length) {
          const r = findProjectId(n.children, pid);
          if (r != null) return r;
        }
      }
      return null;
    };

    const pProjectId = findProjectId(allRows, childModal.parentId);
    newChild.projectId = pProjectId;

    setAllRows((prev) => {
      const next = addChildToTree(prev, childModal.parentId, newChild);
      scheduleSave(next, 120);
      return next;
    });

    setChildModal({ open: false, parentId: null, title: '', desc: '' });
  };

  const toggleExpand = useCallback((id) => {
    const rec = (nodes) =>
      nodes.map((n) => {
        if (n.id === id) return { ...n, expanded: !n.expanded };
        if (n.children?.length) return { ...n, children: rec(n.children) };
        return n;
      });
    setAllRows((prev) => rec(prev));
  }, []);

  const updateNodeMeta = useCallback((nodes, id, patch) => {
    const rec = (arr) =>
      arr.map((n) => {
        if (n.id === id) return { ...n, ...patch };
        if (n.children?.length) return { ...n, children: rec(n.children) };
        return n;
      });
    return rec(nodes);
  }, []);

  const [editRowModal, setEditRowModal] = useState({
    open: false,
    rowId: null,
    title: '',
    desc: '',
    isOther: false,
  });

  const openEditRowModal = (row) => {
    const baseTitle = row?.title || '';
    const showTitle =
      row?.isOther ? baseTitle : (row?.projectId != null ? getProjectLabelById(row.projectId, baseTitle) : baseTitle);

    setEditRowModal({
      open: true,
      rowId: row?.id || null,
      title: showTitle || '',
      desc: row?.desc || '',
      isOther: !!row?.isOther,
    });
  };

  const closeEditRowModal = () =>
    setEditRowModal({ open: false, rowId: null, title: '', desc: '', isOther: false });

  const saveEditRowModal = () => {
    if (!editRowModal.rowId) {
      closeEditRowModal();
      return;
    }
    setAllRows((prev) => {
      const next = updateNodeMeta(prev, editRowModal.rowId, {
        title: editRowModal.isOther ? editRowModal.title : undefined,
        desc: editRowModal.desc,
      });
      scheduleSave(next, 120);
      return next;
    });
    closeEditRowModal();
  };

  const [monthModal, setMonthModal] = useState({
    open: false,
    rowId: null,
    monthKey: '',
    label: '',
    title: '',
    value: '',
  });
  const monthInputRef = useRef(null);

  const updateNodeMonths = useCallback((nodes, id, monthKey, val) => {
    const rec = (arr) =>
      arr.map((n) => {
        if (n.id === id) {
          return {
            ...n,
            months: { ...(n.months || {}), [monthKey]: val },
          };
        }
        if (n.children?.length) return { ...n, children: rec(n.children) };
        return n;
      });
    return rec(nodes);
  }, []);

  const openMonthModal = (row, month) => {
    if (hasChildren(row)) return;
    const rawVal = Number(row.months?.[month.key] || 0);
    setMonthModal({
      open: true,
      rowId: row.id,
      monthKey: month.key,
      label: month.label,
      title: row.title || '',
      value: rawVal ? formatMoney(rawVal) : '',
    });
  };

  const closeMonthModal = () => setMonthModal((prev) => ({ ...prev, open: false }));

  const handleMonthModalChange = (raw) => {
    const en = toEnDigits(raw);
    const digits = en.replace(/[^\d]/g, '');
    const formatted = digits ? formatMoney(Number(digits)) : '';
    setMonthModal((prev) => ({ ...prev, value: formatted }));
  };

  const handleMonthModalSave = () => {
    if (!monthModal.rowId || !monthModal.monthKey) {
      closeMonthModal();
      return;
    }
    const num = parseMoney(monthModal.value);

    setAllRows((prev) => {
      const next = updateNodeMonths(prev, monthModal.rowId, monthModal.monthKey, num);
      scheduleSave(next, 120);
      return next;
    });

    setMonthModal({
      open: false,
      rowId: null,
      monthKey: '',
      label: '',
      title: '',
      value: '',
    });
  };

  useEffect(() => {
    if (monthModal.open && monthInputRef.current) {
      monthInputRef.current.focus();
      monthInputRef.current.select();
    }
  }, [monthModal.open]);

  const displayRows = useMemo(() => {
    const out = [];

    const walk = (node, depth, indexPath) => {
      out.push({ type: 'node', node, depth, indexPath });

      if (node.expanded) {
        const children = node.children || [];
        children.forEach((ch, i) => walk(ch, depth + 1, [...indexPath, i + 1]));
        out.push({ type: 'addChild', parentId: node.id, depth: depth + 1, indexPath: [...indexPath, 0] });
      }
    };

    (visibleRoots || []).forEach((r, i) => walk(r, 0, [i + 1]));
    return out;
  }, [visibleRoots]);

  const indexLabel = (pathArr) => {
    if (!pathArr?.length) return '';
    const cleaned = pathArr.filter((x) => x !== 0);
    return cleaned.join('.');
  };

  const otherRoots = useMemo(() => {
    const roots = (allRows || []).filter((r) => r?.isOther && (r.otherUid || r.id));
    const byUid = new Map();
    roots.forEach((r) => byUid.set(String(r.otherUid || r.id), r));
    return { roots, byUid };
  }, [allRows]);

  const otherLabelMap = useMemo(() => {
    const map = new Map();
    (poolOtherIds || []).forEach((oid, idx) => {
      const r = otherRoots.byUid.get(String(oid));
      const t = stripOtherUid(r?.title || '');
      map.set(String(oid), t || `سایر ${toFaDigits(idx + 1)}`);
    });
    return map;
  }, [poolOtherIds, otherRoots]);

  const totalCols = 2 + dynamicMonths.length + 1;

  const [showModal, setShowModal] = useState(false);

  const printModal = () => {
    const el = document.getElementById('revenue-preview');
    if (!el) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html lang="fa" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>برآورد درآمدها</title>
          <style>
            @page { size: A4; margin: 14mm; }
            *{box-sizing:border-box}
            body { font-family: Vazirmatn, Vazir, IRANSans, Segoe UI, Tahoma, sans-serif; color:#0f172a; background:#fff; margin:0; }
            h2 { margin: 0 0 12px; font-size: 16px; }
            .wrap { max-width: 190mm; margin: 0 auto; }
            .panel { border:1px solid #e5e7eb; border-radius:16px; padding:16px; }
            table { width:100%; border-collapse: collapse; font-size: 12px; }
            th, td { border-top: 1px solid #e5e7eb; padding: 8px; text-align: center; }
            thead th { background:#f8fafc; border-top:none; }
          </style>
        </head>
        <body>
          <div class="wrap panel">${el.innerHTML}</div>
          <script>window.print(); setTimeout(()=>window.close(), 300);</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const exportExcel = () => {
    const buildCell = (v) =>
      String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const headerHtml = `
      <tr>
        <th>#</th>
        <th>پروژه / مورد</th>
        ${dynamicMonths.map((m) => `<th>${buildCell(m.label)}</th>`).join('')}
        <th>جمع</th>
      </tr>
    `;

    const rowsFlat = displayRows.filter((x) => x.type === 'node').map((x) => x);

    const bodyHtml = rowsFlat
      .map((x, i) => {
        const r = x.node;
        const rowTotal = sumNodeMonths(r);
        const titleCell =
          x.depth === 0 && r?.projectId != null
            ? getProjectLabelById(r.projectId, r.title || '—')
            : (r.title || '—');

        const monthsHtml = dynamicMonths
          .map((m) => {
            const val = sumNodeMonth(r, m.key);
            return `<td>${val ? buildCell(toFaDigits(formatMoney(val))) : '—'}</td>`;
          })
          .join('');
        return `
          <tr>
            <td>${buildCell(toFaDigits(indexLabel(x.indexPath) || (i + 1)))}</td>
            <td>${buildCell(titleCell)}</td>
            ${monthsHtml}
            <td>${rowTotal ? buildCell(toFaDigits(formatMoney(rowTotal))) : '—'}</td>
          </tr>
        `;
      })
      .join('');

    const footerHtml = `
      <tr>
        <td>-</td>
        <td>جمع</td>
        ${dynamicMonths
          .map((m) => {
            const v = totalsByMonth[m.key];
            return `<td>${v ? buildCell(toFaDigits(formatMoney(v))) : '—'}</td>`;
          })
          .join('')}
        <td>${totalGrand ? buildCell(toFaDigits(formatMoney(totalGrand))) : '—'}</td>
      </tr>
    `;

    const noRowsHtml = `<tr><td colspan="${2 + dynamicMonths.length + 1}">موردی برای نمایش نیست.</td></tr>`;

    const html = `
      <html lang="fa" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Vazirmatn, Vazir, IRANSans, Segoe UI, Tahoma, sans-serif; direction: rtl; }
            table { border-collapse: collapse; width: 100%; font-size: 11pt; }
            th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: center; vertical-align: middle; }
            thead th { background-color: #f3f4f6; font-weight: 600; }
          </style>
        </head>
        <body>
          <table>
            <thead>${headerHtml}</thead>
            <tbody>${bodyHtml || noRowsHtml}</tbody>
            <tfoot>${footerHtml}</tfoot>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + html], {
      type: 'application/vnd.ms-excel;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'revenue-estimates.xls';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ===== UI states for access =====
  if (accessLoading) {
    return (
      <Card>
        <div className="mb-4 text-black/70 dark:text-neutral-300 text-base md:text-lg">
          <span>بودجه‌بندی</span>
          <span className="mx-2">›</span>
          <span className="font-semibold text-black dark:text-neutral-100">برآورد درآمد ها</span>
        </div>
        <div className="text-sm text-black/70 dark:text-neutral-300">در حال بررسی دسترسی...</div>
      </Card>
    );
  }

  if (!me) {
    return (
      <Card>
        <div className="mb-4 text-black/70 dark:text-neutral-300 text-base md:text-lg">
          <span>بودجه‌بندی</span>
          <span className="mx-2">›</span>
          <span className="font-semibold text-black dark:text-neutral-100">برآورد درآمد ها</span>
        </div>
        <div className="text-sm text-red-600 dark:text-red-400">ابتدا وارد سامانه شوید.</div>
      </Card>
    );
  }

  if (canAccessPage !== true) {
    return (
      <Card>
        <div className="mb-4 text-black/70 dark:text-neutral-300 text-base md:text-lg">
          <span>بودجه‌بندی</span>
          <span className="mx-2">›</span>
          <span className="font-semibold text-black dark:text-neutral-100">برآورد درآمد ها</span>
        </div>
        <div className="text-sm text-black/70 dark:text-neutral-300">شما سطح دسترسی لازم را ندارید.</div>
      </Card>
    );
  }

  // ===== UI: منوی انتخاب سایرها =====
  const [otherMenuOpen, setOtherMenuOpen] = useState(false);
  const anyOtherSelected = useMemo(() => {
    return (poolOtherIds || []).some((oid) => selectedKeys.has(otherKey(oid)));
  }, [poolOtherIds, selectedKeys]);

  const closeOtherMenu = () => setOtherMenuOpen(false);

  return (
    <>
      <Card>
        <div className="mb-3 text-black/70 dark:text-neutral-300 text-base md:text-lg">
          <span>بودجه‌بندی</span>
          <span className="mx-2">›</span>
          <span className="font-semibold text-black dark:text-neutral-100">برآورد درآمد ها</span>
        </div>

        {/* کپسول/انتخاب پروژه‌ها */}
        <div className="rounded-2xl border border-black/10 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur px-3 py-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs text-black/60 dark:text-neutral-400">پروژه‌ها را انتخاب کنید تا وارد جدول شوند:</div>
            <div className="text-xs text-black/50 dark:text-neutral-500">
              انتخاب‌شده: <span className="font-semibold">{toFaDigits(selectedKeys.size)}</span>
            </div>
          </div>

          {/* انتخاب پروژه + دکمه افزودن (فقط اضافه به کپسول‌ها) */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 flex items-stretch gap-2">
              <select
                value={pickedProjectId}
                onChange={(e) => setPickedProjectId(e.target.value)}
                className="flex-1 h-11 rounded-2xl border border-black/15 bg-white text-black px-3 text-sm outline-none focus:ring-2 focus:ring-black/10
                  dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                title="انتخاب پروژه"
              >
                <option value="">پروژه را انتخاب کنید...</option>
                <option value="__ALL__">انتخاب همه موارد</option>
                {projects.map((p) => {
                  const pid = String(p?.id ?? '');
                  if (!pid) return null;
                  return (
                    <option key={pid} value={pid}>
                      {getProjectLabel(p)}
                    </option>
                  );
                })}
              </select>

              <button
                type="button"
                onClick={addPickedProject}
                disabled={!pickedProjectId}
                className="h-11 w-12 rounded-2xl bg-black text-white grid place-items-center transition disabled:opacity-40 disabled:cursor-not-allowed
                  dark:bg-neutral-100 dark:text-neutral-900"
                aria-label="افزودن پروژه"
                title={!pickedProjectId ? 'ابتدا پروژه را انتخاب کنید' : 'افزودن به کپسول‌ها'}
              >
                <img src="/images/icons/afzodan.svg" alt="" className="w-5 h-5 invert dark:invert-0" />
              </button>
            </div>
          </div>

          {/* کپسول‌ها (با کلیک: اضافه/کم کردن از جدول اصلی) */}
          <div className="mt-3 flex flex-wrap gap-2 relative">
            <button
              type="button"
              onClick={toggleSelectAll}
              className={`px-3 py-2 rounded-full text-xs md:text-[13px] border transition select-none shadow-sm
                ${isAllSelected
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-black/15 hover:bg-black/5 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700 dark:hover:bg-white/10'
                }`}
              title={isAllSelected ? 'لغو انتخاب همه' : 'انتخاب همه'}
            >
              همه
            </button>

            {(poolProjectIds || []).map((pid) => {
              const k = projectKey(pid);
              const active = selectedKeys.has(k);
              const label = getProjectLabelById(pid, '—');
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => onToggleProjectChip(pid)}
                  className={`px-3 py-2 rounded-full text-xs md:text-[13px] border transition select-none shadow-sm inline-flex items-center gap-2
                    ${active
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-black/15 hover:bg-black/5 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700 dark:hover:bg-white/10'
                    }`}
                  title={active ? 'حذف از جدول اصلی' : 'افزودن به جدول اصلی'}
                >
                  <span className="max-w-[220px] truncate">{label}</span>

                  {/* حذف خیلی کوچک */}
                  <span className="inline-flex items-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeProjectChipHard(pid);
                      }}
                      className="h-5 w-5 grid place-items-center rounded-full hover:bg-white/15 dark:hover:bg-white/10"
                      aria-label="حذف کپسول"
                      title="حذف کپسول (حذف از جدول و دیتا)"
                    >
                      <img src="/images/icons/bastan.svg" alt="" className="w-3 h-3 invert dark:invert-0" />
                    </button>
                  </span>
                </button>
              );
            })}

            {/* سایر: فقط یک کپسول + ایکن اضافه + ایکن زیرمجموعه */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOtherMenuOpen((v) => !v)}
                className={`px-3 py-2 rounded-full text-xs md:text-[13px] border transition select-none shadow-sm inline-flex items-center gap-2
                  ${anyOtherSelected
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-black/15 hover:bg-black/5 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700 dark:hover:bg-white/10'
                  }`}
                title="سایر (زیرمجموعه‌ها)"
              >
                <span>سایر</span>

                {/* نشانگر زیرمجموعه */}
                <span className="inline-flex items-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-90">
                    <path
                      d={otherMenuOpen ? 'M7 14l5-5 5 5' : 'M7 10l5 5 5-5'}
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>

                {/* ایکن اضافه فقط کنار سایر */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addOtherChip();
                    setOtherMenuOpen(true);
                  }}
                  className="h-5 w-5 grid place-items-center rounded-full hover:bg-white/15 dark:hover:bg-white/10"
                  aria-label="افزودن سایر"
                  title="افزودن سایر جدید"
                >
                  <img src="/images/icons/afzodan.svg" alt="" className="w-3 h-3 invert dark:invert-0" />
                </button>
              </button>

              {otherMenuOpen && (
                <div className="absolute z-30 mt-2 w-64 rounded-2xl border border-black/10 bg-white text-black shadow-xl overflow-hidden dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
                  <div className="px-3 py-2 text-xs text-black/60 dark:text-neutral-400 border-b border-black/10 dark:border-neutral-800">
                    زیرمجموعه‌های سایر را انتخاب/حذف کنید
                  </div>

                  <div className="max-h-72 overflow-auto">
                    {(poolOtherIds || []).length === 0 ? (
                      <div className="px-3 py-3 text-xs text-black/60 dark:text-neutral-400">
                        هنوز موردی اضافه نشده.
                      </div>
                    ) : (
                      (poolOtherIds || []).map((oid) => {
                        const k = otherKey(oid);
                        const active = selectedKeys.has(k);
                        const label = otherLabelMap.get(String(oid)) || 'سایر';
                        return (
                          <button
                            key={k}
                            type="button"
                            onClick={() => onToggleOtherChip(oid)}
                            className={`w-full px-3 py-2 flex items-center justify-between gap-2 text-xs transition border-b border-black/5 dark:border-neutral-800
                              ${active ? 'bg-black text-white' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
                            title={active ? 'حذف از جدول' : 'افزودن به جدول'}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`inline-flex h-5 w-5 rounded-full border items-center justify-center text-[10px]
                                ${active ? 'border-white/40' : 'border-black/20 dark:border-neutral-700'}`}>
                                {active ? '✓' : ''}
                              </span>
                              <span className="truncate">{label}</span>
                            </div>

                            {/* حذف خیلی کوچک */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                removeOtherChipHard(oid);
                              }}
                              className={`h-6 w-6 grid place-items-center rounded-xl ring-1
                                ${active ? 'ring-white/30 hover:bg-white/15' : 'ring-black/10 hover:bg-black/5 dark:ring-neutral-700 dark:hover:bg-white/10'}`}
                              aria-label="حذف این سایر"
                              title="حذف این سایر (حذف از جدول و دیتا)"
                            >
                              <img src="/images/icons/bastan.svg" alt="" className="w-3 h-3 invert dark:invert-0" />
                            </button>
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="px-3 py-2 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={closeOtherMenu}
                      className="h-9 px-4 rounded-xl border border-black/15 text-xs hover:bg-black/5 dark:border-neutral-700 dark:hover:bg-white/10"
                    >
                      بستن
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* جدول اصلی (فقط موارد انتخاب‌شده) */}
        <div className="mt-4">
          <TableWrap>
            <div className="bg-white rounded-2xl overflow-hidden border border-black/10 shadow-sm text-black dark:bg-neutral-900 dark:text-neutral-200 dark:border-neutral-800">
              <div className="overflow-x-auto">
                <table
                  className="w-full table-fixed text-[11px] md:text-[12px] leading-tight text-center [&_th]:text-center [&_td]:text-center"
                  dir="rtl"
                >
                  <THead>
                    <tr className="bg-black/5 border-b border-black/10 sticky top-0 z-10 text-black dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-700">
                      <TH className="!text-center py-2 w-14 !text-black dark:!text-neutral-300">#</TH>
                      <TH className="!text-center py-2 w-56 !text-black dark:!text-neutral-300">پروژه / مورد</TH>
                      {dynamicMonths.map((m) => (
                        <TH key={m.key} className="!text-center py-2 w-24 px-0 !text-black dark:!text-neutral-300">
                          {m.label}
                        </TH>
                      ))}
                      <TH className="!text-center py-2 w-28 !text-black dark:!text-neutral-300 border-l border-r border-black/10 dark:border-neutral-700">
                        جمع
                      </TH>
                    </tr>
                  </THead>

                  <tbody className="[&_td]:text-black dark:[&_td]:text-neutral-100">
                    {visibleRoots.length > 0 && (
                      <TR className="text-center border-t border-black/10 bg-black/[0.035] font-semibold dark:border-neutral-800 dark:bg-white/10">
                        <TD className="px-2 py-2 border-b border-black/10 dark:border-neutral-800">-</TD>
                        <TD className="px-2 py-2 text-center border-b border-black/10 dark:border-neutral-800">جمع</TD>
                        {dynamicMonths.map((m) => (
                          <TD key={m.key} className="px-0 py-2 text-center align-middle border-b border-black/10 dark:border-neutral-800">
                            {totalsByMonth[m.key] ? (
                              <span className="inline-flex items-center justify-center gap-1">
                                <span className="ltr">{toFaDigits(formatMoney(totalsByMonth[m.key]))}</span>
                                <span>ریال</span>
                              </span>
                            ) : (
                              '—'
                            )}
                          </TD>
                        ))}
                        <TD className="px-3 py-2 whitespace-nowrap text-center border-l border-r border-b border-black/10 dark:border-neutral-700">
                          <span className="inline-flex items-center justify-center gap-1">
                            <span className="ltr">{toFaDigits(formatMoney(totalGrand || 0))}</span>
                            <span>ریال</span>
                          </span>
                        </TD>
                      </TR>
                    )}

                    {displayRows.map((x, idx) => {
                      if (x.type === 'addChild') {
                        return (
                          <TR key={'addchild-' + x.parentId} className="border-t border-black/10 bg-black/[0.012] dark:border-neutral-800 dark:bg-white/5">
                            <TD className="px-2 py-2 text-center text-black/60 dark:text-neutral-400">—</TD>
                            <TD className="px-2 py-2 text-center">
                              <div className="flex items-center justify-center" style={{ paddingInlineStart: Math.min(44, x.depth * 18) }}>
                                <button
                                  type="button"
                                  onClick={() => openChildModal(x.parentId)}
                                  className="h-9 w-9 mx-auto grid place-items-center rounded-xl ring-1 ring-black/15 hover:bg-black/5 bg-white dark:bg-neutral-800 dark:ring-neutral-700 dark:hover:bg-white/10"
                                  aria-label="افزودن زیرمجموعه"
                                  title="افزودن زیرمجموعه"
                                >
                                  <img src="/images/icons/afzodan.svg" alt="" className="w-4 h-4 dark:invert" />
                                </button>
                              </div>
                            </TD>
                            {dynamicMonths.map((m) => (
                              <TD key={m.key} className="px-0 py-2 text-center text-black/40 dark:text-neutral-500">—</TD>
                            ))}
                            <TD className="px-3 py-2 text-center text-black/40 dark:text-neutral-500">—</TD>
                          </TR>
                        );
                      }

                      const r = x.node;
                      const rowTotal = sumNodeMonths(r);
                      const isComputed = hasChildren(r);
                      const depthPad = Math.min(44, x.depth * 18);
                      const idxText = indexLabel(x.indexPath);

                      const displayTitle =
                        r.isOther
                          ? (stripOtherUid(r.title) || '—')
                          : (x.depth === 0 && r?.projectId != null
                              ? getProjectLabelById(r.projectId, r.title || '—')
                              : (r.title || '—'));

                      const rootKey = r?.projectId != null ? projectKey(r.projectId) : otherKey(r.otherUid || r.id);
                      const canHideFromTable = x.depth === 0;

                      return (
                        <TR
                          key={r.id}
                          className="text-center border-t border-black/10 odd:bg-black/[0.018] even:bg-black/[0.032] hover:bg-black/[0.05] transition-colors dark:border-neutral-800 dark:odd:bg-white/5 dark:even:bg-white/10 dark:hover:bg-white/15"
                        >
                          <TD className="px-2 py-2">{toFaDigits(idxText || (idx + 1))}</TD>

                          <TD className="px-2 py-2 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              <div className="flex items-center justify-center gap-2" style={{ paddingInlineStart: depthPad }}>
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => openEditRowModal(r)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') openEditRowModal(r);
                                  }}
                                  className="inline-flex flex-row-reverse items-center gap-2 px-3 py-1.5 rounded-full border border-black/10 bg-white/90 shadow-sm ring-1 ring-black/5 text-[11px] text-black cursor-pointer select-none hover:bg-black/[0.03] hover:shadow transition dark:border-neutral-700 dark:bg-neutral-900/70 dark:ring-0 dark:text-neutral-100 dark:hover:bg-white/10"
                                  title="افزودن/ویرایش توضیحات"
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      toggleExpand(r.id);
                                    }}
                                    className="h-6 w-6 grid place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                                    aria-label="باز/بسته"
                                    title="باز/بسته"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="opacity-90">
                                      <path
                                        d={r.expanded ? 'M7 14l5-5 5 5' : 'M7 10l5 5 5-5'}
                                        stroke="currentColor"
                                        strokeWidth="2.2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  </button>

                                  {r.isOther ? (
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-1 rounded-full text-[10px] border border-black/10 bg-black/[0.03] text-black/70 dark:border-neutral-700 dark:bg-white/5 dark:text-neutral-200">
                                        سایر
                                      </span>
                                      <input
                                        value={stripOtherUid(r.title)}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          setAllRows((prev) => {
                                            const next = updateNodeMeta(prev, r.id, { title: v });
                                            scheduleSave(next, 120);
                                            return next;
                                          });
                                        }}
                                        placeholder="عنوان..."
                                        className="w-[110px] md:w-[130px] bg-transparent outline-none text-center placeholder-black/40 dark:placeholder-neutral-500"
                                      />
                                    </div>
                                  ) : (
                                    <span className="max-w-[240px] truncate">{displayTitle}</span>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  if (canHideFromTable) removeFromSelected(rootKey);
                                }}
                                disabled={!canHideFromTable}
                                className={`h-8 w-8 grid place-items-center rounded-xl ring-1 ring-black/10 dark:ring-neutral-700
                                  ${canHideFromTable ? 'hover:bg-black/5 dark:hover:bg-white/10' : 'opacity-40 cursor-not-allowed'}`}
                                aria-label="حذف از جدول"
                                title={canHideFromTable ? 'حذف از جدول (نمایشی)' : 'حذف فقط برای سطرهای اصلی فعال است'}
                              >
                                <img src="/images/icons/bastan.svg" alt="" className="w-3 h-3 dark:invert" />
                              </button>
                            </div>
                          </TD>

                          {dynamicMonths.map((m) => {
                            const val = sumNodeMonth(r, m.key);
                            const hasVal = !!val;
                            return (
                              <TD key={m.key} className="px-0 py-2 text-center align-middle">
                                <button
                                  type="button"
                                  onClick={() => openMonthModal(r, m)}
                                  disabled={isComputed}
                                  className={`w-24 mx-auto h-9 md:w-24 md:h-9 rounded-xl border text-[11px] md:text-[12px] flex items-center justify-center shadow-sm transition ${
                                    hasVal
                                      ? 'bg-[#edaf7c] border-[#edaf7c]/90 text-black'
                                      : 'bg-black/5 border-black/10 text-black/70 dark:bg-white/5 dark:border-neutral-700 dark:text-neutral-100'
                                  } ${isComputed ? 'opacity-70 cursor-default' : 'cursor-pointer'}`}
                                  title={isComputed ? 'این مقدار از زیرمجموعه‌ها محاسبه می‌شود' : 'ثبت/ویرایش مقدار (و ذخیره)'}
                                >
                                  {hasVal ? (
                                    <div className="flex flex-col items-center justify-center leading-tight">
                                      <span>{toFaDigits(formatMoney(val))}</span>
                                      <span className="mt-0.5 text-[10px] text-black/70 dark:text-neutral-300">ریال</span>
                                    </div>
                                  ) : (
                                    '—'
                                  )}
                                </button>
                              </TD>
                            );
                          })}

                          <TD className="px-3 py-2 whitespace-nowrap text-center border-l border-r border-black/10 dark:border-neutral-700">
                            <span className="inline-flex items-center justify-center gap-1">
                              <span className="ltr">{toFaDigits(formatMoney(rowTotal || 0))}</span>
                              <span>ریال</span>
                            </span>
                          </TD>
                        </TR>
                      );
                    })}

                    {visibleRoots.length === 0 && (
                      <TR className="border-t border-black/10 dark:border-neutral-800">
                        <TD colSpan={totalCols} className="py-6 text-black/60 dark:text-neutral-400 text-center">
                          از کپسول‌های بالا استفاده کنید تا موارد به جدول اصلی اضافه/کم شوند.
                        </TD>
                      </TR>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TableWrap>
        </div>

        {/* دکمه ذخیره دستی (اختیاری) */}
        <div className="mt-4 flex items-center gap-2 justify-end">
          <button
            onClick={handleSave}
            className="h-10 w-10 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 grid place-items-center disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="ذخیره دستی"
            title="ذخیره دستی"
          >
            <img src="/images/icons/check.svg" alt="" className="w-5 h-5 invert dark:invert-0" />
          </button>
        </div>

        {monthModal.open && (
          <div className="fixed inset-0 z-40 grid place-items-center px-3">
            <div className="absolute inset-0 bg-black/25 dark:bg-neutral-950/55 backdrop-blur-[2px]" onClick={closeMonthModal} />
            <div
              className="relative w-full max-w-sm rounded-2xl bg-white text-neutral-900 border border-black/10 shadow-2xl dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 p-4 space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">برآورد درآمد ها</div>
                  <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 space-y-0.5">
                    <div>ماه: <b>{monthModal.label || '—'}</b></div>
                    <div className="text-[11px]">ردیف: <b>{monthModal.title || '—'}</b></div>
                  </div>
                </div>
                <button type="button" onClick={closeMonthModal} className="h-8 w-8 grid place-items-center rounded-xl bg-black text-white dark:bg-neutral-100 dark:text-neutral-900">
                  <img src="/images/icons/bastan.svg" alt="" className="w-4 h-4 invert dark:invert-0" />
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-neutral-600 dark:text-neutral-300">مبلغ برآورد برای این ماه</label>
                <div className="flex items-center gap-2">
                  <input
                    ref={monthInputRef}
                    dir="ltr"
                    className="flex-1 w-full rounded-xl px-3 py-2 text-sm text-center bg-white text-black placeholder-black/40 border border-black/15 outline-none focus:ring-2 focus:ring-black/10 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                    placeholder="0"
                    value={monthModal.value ? toFaDigits(monthModal.value) : ''}
                    onChange={(e) => handleMonthModalChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleMonthModalSave();
                      }
                    }}
                  />
                  <span className="text-xs text-neutral-600 dark:text-neutral-300">ریال</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button type="button" onClick={closeMonthModal} className="h-9 px-4 rounded-xl border border-neutral-300 text-xs text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800">
                  انصراف
                </button>
                <button type="button" onClick={handleMonthModalSave} className="h-9 px-5 rounded-xl bg-neutral-900 text-xs text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
                  ثبت برآورد
                </button>
              </div>
            </div>
          </div>
        )}

        {childModal.open && (
          <div className="fixed inset-0 z-40 grid place-items-center px-3">
            <div className="absolute inset-0 bg-black/25 dark:bg-neutral-950/55 backdrop-blur-[2px]" onClick={closeChildModal} />
            <div
              className="relative w-full max-w-sm rounded-2xl bg-white text-neutral-900 border border-black/10 shadow-2xl dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 p-4 space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">افزودن زیرمجموعه</div>
                  <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">عنوان و توضیح زیرمجموعه را وارد کنید.</div>
                </div>
                <button type="button" onClick={closeChildModal} className="h-8 w-8 grid place-items-center rounded-xl bg-black text-white dark:bg-neutral-100 dark:text-neutral-900">
                  <img src="/images/icons/bastan.svg" alt="" className="w-4 h-4 invert dark:invert-0" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-xs text-neutral-600 dark:text-neutral-300">عنوان</label>
                  <input
                    type="text"
                    className="w-full rounded-xl px-3 py-2 text-sm bg-white text-black placeholder-black/40 border border-black/15 outline-none focus:ring-2 focus:ring-black/10 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                    value={childModal.title}
                    onChange={(e) => setChildModal((p) => ({ ...p, title: e.target.value }))}
                    placeholder="مثلاً تجهیز کارگاه، فروش مرحله‌ای، ..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-neutral-600 dark:text-neutral-300">توضیحات (اختیاری)</label>
                  <textarea
                    className="w-full min-h-[72px] rounded-xl px-3 py-2 text-sm bg-white text-black placeholder-black/40 border border-black/15 outline-none focus:ring-2 focus:ring-black/10 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                    value={childModal.desc}
                    onChange={(e) => setChildModal((p) => ({ ...p, desc: e.target.value }))}
                    placeholder="در صورت نیاز توضیحات تکمیلی را بنویسید."
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button type="button" onClick={closeChildModal} className="h-9 px-4 rounded-xl border border-neutral-300 text-xs text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800">
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleChildSave}
                  className="h-9 px-5 rounded-xl bg-neutral-900 text-xs text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={!childModal.title.trim()}
                >
                  ذخیره
                </button>
              </div>
            </div>
          </div>
        )}

        {editRowModal.open && (
          <div className="fixed inset-0 z-40 grid place-items-center px-3">
            <div className="absolute inset-0 bg-black/25 dark:bg-neutral-950/55 backdrop-blur-[2px]" onClick={closeEditRowModal} />
            <div
              className="relative w-full max-w-sm rounded-2xl bg-white text-neutral-900 border border-black/10 shadow-2xl dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 p-4 space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">جزئیات / توضیحات</div>
                  <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">در صورت نیاز، توضیحات را ثبت کنید.</div>
                </div>
                <button type="button" onClick={closeEditRowModal} className="h-8 w-8 grid place-items-center rounded-xl bg-black text-white dark:bg-neutral-100 dark:text-neutral-900">
                  <img src="/images/icons/bastan.svg" alt="" className="w-4 h-4 invert dark:invert-0" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-xs text-neutral-600 dark:text-neutral-300">عنوان</label>

                  {editRowModal.isOther ? (
                    <input
                      type="text"
                      className="w-full rounded-xl px-3 py-2 text-sm bg-white text-black placeholder-black/40 border border-black/15 outline-none focus:ring-2 focus:ring-black/10 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                      value={editRowModal.title}
                      onChange={(e) => setEditRowModal((p) => ({ ...p, title: e.target.value }))}
                      placeholder="عنوان دلخواه را وارد کنید"
                    />
                  ) : (
                    <div className="mt-1 w-full rounded-xl px-3 py-2 text-sm bg-black/[0.02] text-black border border-black/10 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700">
                      {editRowModal.title || '—'}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-neutral-600 dark:text-neutral-300">توضیحات (اختیاری)</label>
                  <textarea
                    className="w-full min-h-[88px] rounded-xl px-3 py-2 text-sm bg-white text-black placeholder-black/40 border border-black/15 outline-none focus:ring-2 focus:ring-black/10 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                    value={editRowModal.desc}
                    onChange={(e) => setEditRowModal((p) => ({ ...p, desc: e.target.value }))}
                    placeholder="مثلاً توضیحات تکمیلی برای این مورد..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button type="button" onClick={closeEditRowModal} className="h-9 px-4 rounded-xl border border-neutral-300 text-xs text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800">
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={saveEditRowModal}
                  className="h-9 px-5 rounded-xl bg-neutral-900 text-xs text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={editRowModal.isOther ? !editRowModal.title.trim() : false}
                >
                  ذخیره
                </button>
              </div>
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 grid place-items-center px-2 sm:px-4">
            <div className="absolute inset-0 bg-black/25 dark:bg-neutral-950/55 backdrop-blur-[2px]" onClick={() => setShowModal(false)} />
            <div
              className="relative w-full max-w-3xl bg-white dark:bg-neutral-900 dark:text-neutral-100 rounded-2xl shadow-2xl border border-black/10 dark:border-neutral-800 overflow-hidden max-h-[90vh] flex flex-col"
              style={{ fontFamily: 'Vazirmatn, Vazir, IRANSans, Segoe UI, Tahoma, sans-serif' }}
            >
              <div className="px-4 py-3 border-b border-black/10 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur shrink-0">
                <div className="flex flex-col items-center justify-center text-center gap-1">
                  <h2 className="text-sm md:text-base font-bold text-black dark:text-neutral-100">برآورد درآمد ها</h2>
                </div>
              </div>

              <div id="revenue-preview" className="p-4 max-h-[70vh] overflow-auto space-y-4 text-center flex-1">
                <div className="overflow-auto rounded-xl border border-black/10 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                  <table className="w-full table-fixed text-[11px] md:text-xs text-center [&_th]:text-center [&_td]:text-center">
                    <thead className="bg-black/5 text-black border-b border-black/10 sticky top-0 dark:bg-white/5 dark:text-neutral-100 dark:border-neutral-700">
                      <tr>
                        <th className="py-2.5 px-2 w-16 text-center">#</th>
                        <th className="py-2.5 px-2 w-56 text-center">پروژه / مورد</th>
                        {dynamicMonths.map((m) => (
                          <th key={m.key} className="py-2.5 px-2 w-24 text-center">{m.label}</th>
                        ))}
                        <th className="py-2.5 px-2 w-32 text-center border-l border-r border-black/10 dark:border-neutral-700">جمع</th>
                      </tr>
                    </thead>
                    <tbody className="text-black dark:text-neutral-100">
                      {visibleRoots.length === 0 ? (
                        <tr>
                          <td colSpan={totalCols} className="py-6 text-black/60 dark:text-neutral-400 text-center">موردی برای نمایش نیست.</td>
                        </tr>
                      ) : (
                        <>
                          <tr className="border-t border-b border-black/10 bg-black/[0.04] font-semibold dark:border-neutral-800 dark:bg-white/10">
                            <td className="py-2 px-2 w-16 text-center">-</td>
                            <td className="py-2 px-2 w-56 text-center">جمع</td>
                            {dynamicMonths.map((m) => (
                              <td key={m.key} className="py-2 px-2 w-24 text-center whitespace-nowrap">
                                {totalsByMonth[m.key] ? (
                                  <span className="inline-flex items-center justify-center gap-1">
                                    <span className="ltr">{toFaDigits(formatMoney(totalsByMonth[m.key]))}</span>
                                    <span>ریال</span>
                                  </span>
                                ) : '—'}
                              </td>
                            ))}
                            <td className="py-2 px-2 w-32 text-center whitespace-nowrap border-l border-r border-black/10 dark:border-neutral-700">
                              <span className="inline-flex items-center justify-center gap-1">
                                <span className="ltr">{toFaDigits(formatMoney(totalGrand || 0))}</span>
                                <span>ریال</span>
                              </span>
                            </td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="px-4 py-3 flex items-center justify-between gap-3 border-t border-black/10 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 shrink-0">
                <div className="flex items-center gap-2">
                  <button onClick={printModal} className="h-9 w-11 grid place-items-center rounded-xl border border-black/15 hover:bg-black hover:text-white transition dark:border-neutral-700" aria-label="چاپ" title="چاپ">
                    <img src="/images/icons/print.svg" alt="" className="w-5 h-5" />
                  </button>
                  <button onClick={exportExcel} className="h-9 w-11 grid place-items-center rounded-xl border border-black/15 hover:bg-black/5 transition dark:border-neutral-700 dark:hover:bg-neutral-800" aria-label="خروجی اکسل" title="خروجی اکسل">
                    <img src="/images/icons/excel.svg" alt="" className="w-5 h-5 invert dark:invert-0" />
                  </button>
                </div>
                <button onClick={() => setShowModal(false)} className="h-9 w-11 grid place-items-center rounded-xl bg-black text-white dark:bg-neutral-100 dark:text-neutral-900" aria-label="بستن" title="بستن">
                  <img src="/images/icons/bastan.svg" alt="بستن" className="w-5 h-5 invert dark:invert-0" />
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

export default RevenueEstimatesPage;
