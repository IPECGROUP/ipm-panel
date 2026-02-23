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
import RowActionIconBtn from '../components/ui/RowActionIconBtn.jsx';
import {
  hoverSelectableCrudTablePreset as tablePreset,
  getHoverSelectableRowClass,
} from '../components/ui/tablePresets';

function RevenueEstimatesPage() {
  // This page is intentionally open for any authenticated user (no page-level access check).
  const me = {};
  const accessLoading = false;
  const canAccessPage = true;
  const OTHER_TITLE = '\u0633\u0627\u06cc\u0631';

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

// فقط پروژه‌های اصلی: کد بدون نقطه (مثل 156)
// اگر خواستی دقیقاً 3 رقم باشد: /^\d{3}$/
// ولی چون ممکنه کدها 2 یا 4 رقم هم باشند، بهتره "بدون نقطه" فیلتر کنیم
const isTopProjectCode = (code) => {
  const c = toEnDigits(String(code ?? '')).trim();
  if (!c) return false;
  // ✅ زیرمجموعه‌ها معمولاً نقطه دارند: 156.1.1
  if (c.includes('.')) return false;
  // ✅ فقط عدد باشد
  return /^\d+$/.test(c);
};


  const parseMoney = (s) => {
    if (s == null) return 0;
    const sign = /^\s*-/.test(String(s)) ? -1 : 1;
    const d = toEnDigits(String(s)).replace(/[^\d]/g, '');
    if (!d) return 0;
    return sign * parseInt(d, 10);
  };

  const decodeLatin1ToUtf8 = useCallback((value) => {
    const raw = String(value ?? '');
    if (!raw) return '';
    try {
      const bytes = new Uint8Array(Array.from(raw, (ch) => ch.charCodeAt(0) & 0xff));
      return new TextDecoder('utf-8').decode(bytes);
    } catch {
      return raw;
    }
  }, []);

  const normalizeFaText = useCallback((value) => {
    let out = String(value ?? '');
    for (let i = 0; i < 2; i++) {
      if (!/[ØÙÛ]/.test(out)) break;
      const fixed = decodeLatin1ToUtf8(out);
      if (!fixed || fixed === out) break;
      out = fixed;
    }
    return out;
  }, [decodeLatin1ToUtf8]);

  const normalizeTitleText = useCallback(
    (value) => normalizeFaText(String(value ?? '')).trim(),
    [normalizeFaText]
  );

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
    otherRoot: !!p.otherRoot,
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
    const [poolProjectIds, setPoolProjectIds] = useState([]); // پروژه‌هایی که به کپسول‌ها اضافه شده‌اند
  const [selectedKeysArr, setSelectedKeysArr] = useState([]); // انتخاب‌های فعال برای نمایش در جدول اصلی
useEffect(() => {
  if (canAccessPage !== true) return;

  (async () => {
    try {
      const data = await api('/projects');
      const items =
        Array.isArray(data.items) ? data.items :
        (Array.isArray(data.projects) ? data.projects : []);

      // ✅ فقط پروژه‌های اصلی (بدون زیرمجموعه مثل 156.1.1)
      const topOnly = items.filter((p) => isTopProjectCode(p?.code));

      // ✅ فقط فعال‌ها (اگر غیرفعال‌ها هم می‌خوای، این خط رو حذف کن)
      const topActive = topOnly.filter((p) => p?.isActive !== false);

      // ✅ اگر با فیلتر هیچی درنیومد، حداقل پروژه‌ها را خالی نکن
      // (برای اینکه صفحه خالی نشه و بفهمیم مشکل از فیلتره)
      setProjects(topActive.length ? topActive : items);

      console.log('projects total:', items.length);
      console.log('projects topActive:', topActive.length);
    } catch (e) {
      console.error('load projects failed', e);
      setProjects([]); // اینجا خالی کردن ok
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
 
const getProjectCode = useCallback((p) => {
  // دقیقاً مثل صفحه پروژه‌ها: کد را از همان فیلد اصلی code بردار
  return normalizeTitleText(p?.code ?? '');
}, [normalizeTitleText]);

const projectsForPicker = useMemo(() => {
  return (projects || [])
  .slice()
  .sort((a, b) => {
    const ca = getProjectCode(a);
    const cb = getProjectCode(b);

    if (ca && !cb) return -1;
    if (!ca && cb) return 1;

    const cmp = String(ca).localeCompare(String(cb), 'fa', {
      numeric: true,
      sensitivity: 'base',
    });
if (cmp !== 0) return -cmp; // ✅ نزولی: 165 ... 106

    const na = normalizeTitleText(a?.name ?? a?.title ?? '');
    const nb = normalizeTitleText(b?.name ?? b?.title ?? '');
    return na.localeCompare(nb, 'fa', { numeric: true, sensitivity: 'base' });
  });

}, [projects, getProjectCode, normalizeTitleText]);

const getProjectLabel = useCallback((p) => {
  const code = normalizeTitleText(p?.code ?? '');
  const name = normalizeTitleText(p?.name ?? '');
  if (code && name) return `${code} - ${name}`;
  return code || name || '\u067e\u0631\u0648\u0698\u0647 \u0628\u062f\u0648\u0646 \u0646\u0627\u0645';
}, [normalizeTitleText]);

const projectOptionLabel = useCallback((p) => {
  const code = toFaDigits(normalizeTitleText(p?.code ?? ''));
  const name = normalizeTitleText(p?.name ?? '');
  if (code && name) return `${code} - ${name}`;
  return code || name || '—';
}, [toFaDigits, normalizeTitleText]);

  const getProjectLabelById = useCallback(
    (pid, fallback = '') => {
      const p = projectById.get(String(pid));
      return p ? getProjectLabel(p) : (normalizeFaText(fallback) || '—');
    },
    [projectById, getProjectLabel]
  );

  const SEP = ' › ';

  // ===== انتخاب‌ها (کپسول‌ها) =====

  const [otherMenuOpen, setOtherMenuOpen] = useState(false);

  const projectKey = (pid) => `p:${String(pid)}`;
  const otherKeyFromTitle = (t) => `o:${encodeURIComponent(normalizeTitleText(t))}`;
  const otherTitleFromKey = (k) => {
    try {
      return normalizeTitleText(decodeURIComponent(String(k || '').slice(2)));
    } catch {
      return normalizeTitleText(String(k || '').slice(2));
    }
  };

  const selectedOtherTitles = useMemo(() => {
    return selectedKeysArr
      .filter((k) => String(k).startsWith('o:'))
      .map((k) => otherTitleFromKey(k))
      .filter(Boolean);
  }, [selectedKeysArr]);

  const selectedOtherSet = useMemo(() => new Set(selectedOtherTitles), [selectedOtherTitles]);

  const ensureRootForProject = useCallback((pid) => {
    const spid = String(pid);
    const p = projectById.get(spid);
   const title = p ? getProjectLabel(p) : `پروژه ${String(spid)}`;

    return makeNode({
      id: rowIdRef.current++,
      title,
      desc: '',
      projectId: p?.id ?? spid,
      months: {},
      children: [],
      expanded: true,
      isOther: false,
    });
  }, [projectById, getProjectLabel]);

  const ensureOtherRoot = useCallback(() => {
    return makeNode({
      id: 'other-root',
      title: OTHER_TITLE,
      desc: '',
      projectId: null,
      months: {},
      children: [],
      expanded: true,
      isOther: true,
      otherRoot: true,
    });
  }, [OTHER_TITLE]);

  const getOtherRoot = useCallback((rows) => {
    return (rows || []).find((r) => r?.isOther && r?.otherRoot);
  }, []);

  const upsertOtherRoot = useCallback((rows) => {
    const ex = getOtherRoot(rows);
    if (ex) return rows;
    return [...(rows || []), ensureOtherRoot()];
  }, [ensureOtherRoot, getOtherRoot]);

  const visibleRoots = useMemo(() => {
    const out = [];
    (allRows || []).forEach((r) => {
      if (!r) return;
      if (r.otherRoot === true) {
        (r.children || []).forEach((ch) => {
          const t = normalizeTitleText(ch?.title || '');
          if (!t) return;
          if (selectedOtherSet.has(t)) out.push(ch);
        });
        return;
      }
      if (r?.projectId != null && (r.children || []).length === 0) {
        return;
      }
      if (r?.projectId != null) {
        out.push(r);
        return;
      }
      if ((r.children || []).length > 0) out.push(r);
    });
    return out;
  }, [allRows, normalizeTitleText, selectedOtherSet]);

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

      const getOrCreateChild = (parent, seg, isOtherChild = false) => {
        const arr = parent.children || [];
        let found = arr.find((x) => x.title === seg);
        if (!found) {
          found = makeNode({
            id: rowIdRef.current++,
            title: seg,
            desc: '',
            projectId: parent.projectId,
            months: {},
            children: [],
            expanded: false,
            isOther: !!isOtherChild,
            otherRoot: false,
          });
          parent.children = [...arr, found];
        }
        return found;
      };

      const ensureRoot = (seg0, projectId, isOther) => {
        let key = '';
        if (projectId != null) key = 'p:' + String(projectId);
        else if (isOther && seg0 === OTHER_TITLE) key = 'otherRoot';
        else key = 'null::' + String(seg0);

        if (!rootMap.has(key)) {
          rootMap.set(
            key,
            makeNode({
              id: (key === 'otherRoot') ? 'other-root' : rowIdRef.current++,
              title: seg0,
              desc: '',
              projectId: projectId != null ? projectId : null,
              months: {},
              children: [],
              expanded: false,
              isOther: !!isOther,
              otherRoot: key === 'otherRoot',
            })
          );
        }
        return rootMap.get(key);
      };

      items.forEach((it) => {
        const rawTitle = normalizeTitleText(it.title || ''); // فقط title
        if (!rawTitle) return;
        if (rawTitle === '__META__') return;

        let parts = rawTitle
          .split(SEP)
          .map((x) => normalizeTitleText(x))
          .filter(Boolean);
        if (!parts.length) return;

        const projectId = it.project_id ?? null;
        const isOther = it.is_other === true || it.isOther === true;

        // سایرها: همه زیر روت "سایر"
        if (isOther && projectId == null) {
          if (parts[0] !== OTHER_TITLE) parts = [OTHER_TITLE, ...parts];
        }

        const monthsMap = {};
        (it.months || []).forEach((m) => {
          if (m && m.key) monthsMap[m.key] = Number(m.amount || 0);
        });

        // ✅ اگر پروژه دارد: ریشه باید از projectId ساخته شود (نه از title ذخیره شده)
let root;

if (projectId != null) {
  // کلید ثابت برای هر پروژه
  const key = 'p:' + String(projectId);

  if (!rootMap.has(key)) {
    // ریشه پروژه با عنوان درست از لیست پروژه‌ها
    rootMap.set(key, ensureRootForProject(projectId));
  }

  root = rootMap.get(key);

  // ✅ اگر title قبلاً با "کد - نام" ذخیره شده بود، آن را حذف کن تا 800 یا اسم‌های اضافی نگیرد
  // یعنی مسیر واقعی از level 1 شروع می‌شود
  // parts[0] را نادیده می‌گیریم
  parts = parts.slice(1);
} else {
  // سایر یا آیتم‌های بدون پروژه
  root = ensureRoot(parts[0], projectId, isOther);
  parts = parts.slice(1);
}

let node = root;
for (let i = 0; i < parts.length; i++) {
  const seg = parts[i];
  const isOtherChild = (root?.otherRoot === true);
  node = getOrCreateChild(node, seg, isOtherChild);
}

        node.desc = normalizeFaText(String(it.description || ''));
        node.projectId = projectId != null ? projectId : node.projectId || null;
        node.months = monthsMap;
      });

      return Array.from(rootMap.values());
    },
    [OTHER_TITLE]
  );

  const metaRef = useRef({ poolProjectIds: [], selectedKeysArr: [] });

  useEffect(() => {
    metaRef.current = { poolProjectIds: poolProjectIds || [], selectedKeysArr: selectedKeysArr || [] };
  }, [poolProjectIds, selectedKeysArr]);

  useEffect(() => {
    if (canAccessPage !== true) return;
    (async () => {
      try {
        const data = await api('/revenue-estimates');
        const items = data.items || [];

        if (!items.length) {
          setAllRows([]);
          setPoolProjectIds([]);
          setSelectedKeysArr([]);
          return;
        }

        items.sort((a, b) => (a.row_index || 0) - (b.row_index || 0));

        let meta = null;
        for (const it of items) {
          const t = normalizeTitleText(it?.title || '');
          if (t === '__META__') {
            try {
              meta = JSON.parse(String(it?.description || '{}') || '{}');
            } catch {
              meta = null;
            }
            break;
          }
        }

        const itemsNoMeta = items.filter((x) => normalizeTitleText(x?.title || '') !== '__META__');

        rowIdRef.current = 1;
        let tree = buildTreeFromItems(itemsNoMeta);

        // تضمین روت سایر اگر دیتا دارد
        const hasOtherInTree = (tree || []).some((r) => r?.isOther && r?.otherRoot);
        const shouldHaveOther = hasOtherInTree || itemsNoMeta.some((x) => (x.is_other === true || x.isOther === true) && (x.project_id == null));
        if (shouldHaveOther) tree = upsertOtherRoot(tree);

        setAllRows(tree);

        // پروژه‌ها از meta (اگر باشد) یا از خود tree
        // پروژه‌ها از meta (اگر باشد) یا از خود tree
const pidsFromTree = [];
(tree || []).forEach((r) => {
  if (r?.projectId != null) pidsFromTree.push(String(r.projectId));
});
const uniqTree = Array.from(new Set(pidsFromTree));

const hasMetaPool = Array.isArray(meta?.poolProjectIds);
const metaPool = hasMetaPool ? meta.poolProjectIds.map((x) => String(x)).filter(Boolean) : null;
const nextPool = hasMetaPool ? Array.from(new Set(metaPool)) : uniqTree;
setPoolProjectIds(nextPool);

// انتخاب‌ها از meta (اگر باشد) یا همه
const otherRoot = getOtherRoot(tree);
const otherTitles = (otherRoot?.children || [])
  .map((ch) => normalizeTitleText(ch?.title || ''))
  .filter(Boolean);

const defaultKeys = [];

const hasMetaSel = Array.isArray(meta?.selectedKeysArr);
const metaSel = hasMetaSel ? meta.selectedKeysArr.map(String) : null;
const rawSel = hasMetaSel ? metaSel : defaultKeys;

const allowedProjectKeys = new Set(nextPool.map((pid) => projectKey(pid)));
const allowedOtherKeys = new Set(otherTitles.map((t) => otherKeyFromTitle(t)));

const filteredSel = (rawSel || []).filter((k) => {
  const s = String(k || '');
  if (s.startsWith('p:')) return allowedProjectKeys.has(s);
  if (s.startsWith('o:')) return allowedOtherKeys.has(s);
  return false;
});

// نکته مهم: اگر metaSel وجود داشت (حتی خالی)، همون را نگه دار
const finalSel = hasMetaSel ? filteredSel : (filteredSel.length ? filteredSel : defaultKeys);

setSelectedKeysArr(Array.from(new Set(finalSel)));

      } catch (e) {
        console.error('load revenue estimates failed', e);
      }
    })();
  }, [buildTreeFromItems, canAccessPage, upsertOtherRoot, getOtherRoot, normalizeTitleText]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== Auto Save =====
  const saveTimerRef = useRef(null);
  const savingRef = useRef(false);
  const pendingRowsRef = useRef(null);
  const lastSavedRef = useRef('');

  const saveRowsToServer = useCallback(
    async (rowsArg) => {
      const flatten = [];
      const buildTitlePath = (prefix, node) => (prefix ? prefix + SEP + node.title : node.title);

      const walk = (node, prefix) => {
        const titlePath = buildTitlePath(prefix, node);
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

        (node.children || []).forEach((ch) => walk(ch, titlePath));
      };

      (rowsArg || []).forEach((r) => walk(r, ''));

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

      const meta = metaRef.current || { poolProjectIds: [], selectedKeysArr: [] };
      payloadRows.push({
        code: '__META__',
        row_index: payloadRows.length + 1,
        title: '__META__',
        description: JSON.stringify({
          poolProjectIds: meta.poolProjectIds || [],
          selectedKeysArr: meta.selectedKeysArr || [],
        }),
        project_id: null,
        is_other: true,
        months: [],
        amount: 0,
      });

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
    (nextRows, delay = 150) => {
      if (canAccessPage !== true) return;
      pendingRowsRef.current = nextRows;

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async function run() {
  if (savingRef.current) {
    saveTimerRef.current = setTimeout(run, 200);
    return;
  }
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

  // ===== ابزارهای انتخاب/نمایش =====
  const removeFromSelected = (k) => {
    setSelectedKeysArr((prev) => {
      const next = prev.filter((x) => x !== k);
      metaRef.current = {
        ...(metaRef.current || {}),
        poolProjectIds: (metaRef.current?.poolProjectIds ?? poolProjectIds ?? []),
        selectedKeysArr: next,
      };
      return next;
    });
  };

  const toggleSelected = (k) => {
    setSelectedKeysArr((prev) => {
      const s = new Set(prev);
      if (s.has(k)) s.delete(k);
      else s.add(k);
      const next = Array.from(s);
      metaRef.current = {
        ...(metaRef.current || {}),
        poolProjectIds: (metaRef.current?.poolProjectIds ?? poolProjectIds ?? []),
        selectedKeysArr: next,
      };
      return next;
    });
  };

  // ===== سایر: روت + زیرمجموعه‌ها =====
  const ensureOtherRootInState = () => {
    setAllRows((prev) => {
      const next = upsertOtherRoot(prev || []);
      if (next !== prev) scheduleSave(next, 150);
      return next;
    });
  };

  const [otherDraftTitle, setOtherDraftTitle] = useState('');
  const [otherDraftErr, setOtherDraftErr] = useState('');
  const otherTitleRef = useRef(null);

  useEffect(() => {
    if (otherMenuOpen && otherTitleRef.current) {
      otherTitleRef.current.focus();
      otherTitleRef.current.select();
    }
  }, [otherMenuOpen]);

  const addOtherChildWithTitle = (rawTitle) => {
  const title = normalizeTitleText(rawTitle || '');
  if (!title) return;

  const selK = otherKeyFromTitle(title);

  // ✅ مهم: قبل از هر scheduleSave، metaRef و انتخاب‌ها را همینجا سینک کن
  const nextSel = Array.from(new Set([...(selectedKeysArr || []), selK]));
  setSelectedKeysArr(nextSel);
  metaRef.current = {
    ...(metaRef.current || {}),
    poolProjectIds: (metaRef.current?.poolProjectIds ?? poolProjectIds ?? []),
    selectedKeysArr: nextSel,
  };

  ensureOtherRootInState();

  setAllRows((prev) => {
    const rows = upsertOtherRoot(prev || []);
    const otherRoot = getOtherRoot(rows);
    if (!otherRoot) return rows;

    const exists = (otherRoot.children || []).some(
      (ch) => normalizeTitleText(ch?.title || '') === title
    );
    if (exists) {
      scheduleSave(rows, 150);
      return rows;
    }

    const newChild = makeNode({
      id: rowIdRef.current++,
      title,
      desc: '',
      projectId: null,
      months: {},
      children: [],
      expanded: true,
      isOther: true,
      otherRoot: false,
    });

    const rec = (arr) =>
      arr.map((n) => {
        if (n?.isOther && n?.otherRoot) {
          return { ...n, expanded: true, children: [...(n.children || []), newChild] };
        }
        if (n.children?.length) return { ...n, children: rec(n.children) };
        return n;
      });

    const next = rec(rows);
    scheduleSave(next, 150);
    return next;
  });
};


  const handleAddOtherFromModal = () => {
    const t = normalizeTitleText(otherDraftTitle || '');
    if (!t) {
      setOtherDraftErr('عنوان را وارد کنید.');
      return;
    }

    const otherRoot = getOtherRoot(allRows);
    const exists = (otherRoot?.children || []).some(
      (ch) => normalizeTitleText(ch?.title || '') === t
    );
    if (exists) {
  setOtherDraftErr('این عنوان قبلاً اضافه شده است.');

  const selK = otherKeyFromTitle(t);
  const nextSel = Array.from(new Set([...(selectedKeysArr || []), selK]));
  setSelectedKeysArr(nextSel);
  metaRef.current = {
    ...(metaRef.current || {}),
    poolProjectIds: (metaRef.current?.poolProjectIds ?? poolProjectIds ?? []),
    selectedKeysArr: nextSel,
  };

  scheduleSave(allRows || [], 150);
  return;
}

    setOtherDraftErr('');
    addOtherChildWithTitle(t);
    setOtherDraftTitle('');
  };

  const toggleOtherChild = (title) => {
    const t = normalizeTitleText(title || '');
    if (!t) return;
    toggleSelected(otherKeyFromTitle(t));
    scheduleSave(allRows || [], 150);
  };

  const deleteOtherChild = (title) => {
    const t = normalizeTitleText(title || '');
    if (!t) return;

    removeFromSelected(otherKeyFromTitle(t));

    setAllRows((prev) => {
      const rec = (arr) =>
        arr.map((n) => {
          if (n?.isOther && n?.otherRoot) {
            const nextChildren = (n.children || []).filter(
              (ch) => normalizeTitleText(ch?.title || '') !== t
            );
            return { ...n, children: nextChildren };
          }
          if (n.children?.length) return { ...n, children: rec(n.children) };
          return n;
        });
      const next = rec(prev || []);
      scheduleSave(next, 150);
      return next;
    });
  };

  const selectedProjectTargets = useMemo(() => {
    return (projectsForPicker || [])
      .map((p) => {
        const pid = String(p?.id ?? '').trim();
        if (!pid) return null;
        return {
          id: pid,
          rawId: p?.id ?? pid,
          label: projectOptionLabel(p),
        };
      })
      .filter(Boolean);
  }, [projectsForPicker, projectOptionLabel]);

  // ===== Tree ops =====
  const [childParentId, setChildParentId] = useState('');
  const [childDraftTitle, setChildDraftTitle] = useState('');
  const [childDraftErr, setChildDraftErr] = useState('');

  useEffect(() => {
    if (!selectedProjectTargets.length) {
      if (childParentId) setChildParentId('');
      return;
    }
    const exists = selectedProjectTargets.some((item) => String(item.id) === String(childParentId));
    if (!exists) setChildParentId(String(selectedProjectTargets[0].id));
  }, [selectedProjectTargets, childParentId]);

  const findNodeById = (nodes, id) => {
    for (const n of nodes || []) {
      if (String(n?.id) === String(id)) return n;
      const r = findNodeById(n?.children, id);
      if (r) return r;
    }
    return null;
  };

  const addChildToTree = useCallback((tree, parentId, child) => {
    const rec = (nodes) =>
      nodes.map((n) => {
        if (String(n?.id) === String(parentId)) {
          const nextChildren = [...(n.children || []), child];
          return { ...n, children: nextChildren, expanded: true };
        }
        if (n.children?.length) return { ...n, children: rec(n.children) };
        return n;
      });
    return rec(tree);
  }, []);

  const handleAddChildFromPanel = () => {
    const projectId = String(childParentId || '').trim();
    const title = normalizeTitleText(childDraftTitle || '');

    if (!projectId) {
      setChildDraftErr('ابتدا پروژه را انتخاب کنید.');
      return;
    }

    if (!title) {
      setChildDraftErr('عنوان زیرمجموعه را وارد کنید.');
      return;
    }

    const selectedProject = selectedProjectTargets.find(
      (item) => String(item.id) === projectId
    );
    if (!selectedProject) {
      setChildDraftErr('پروژه انتخاب‌شده در لیست پروژه‌های فعال موجود نیست.');
      return;
    }

    const parentNode = (allRows || []).find(
      (r) => r?.otherRoot !== true && r?.projectId != null && String(r.projectId) === projectId
    );

    if (parentNode) {
      const duplicate = (parentNode.children || []).some(
        (ch) => normalizeTitleText(ch?.title || '') === title
      );
      if (duplicate) {
        setChildDraftErr('این زیرمجموعه قبلاً ثبت شده است.');
        return;
      }
    }

    setChildDraftErr('');

    const newChild = makeNode({
      id: rowIdRef.current++,
      title,
      desc: '',
      projectId: parentNode?.projectId ?? selectedProject.rawId ?? projectId,
      months: {},
      children: [],
      expanded: false,
      isOther: false,
      otherRoot: false,
    });

    let next = allRows || [];
    if (parentNode) {
      next = addChildToTree(next, parentNode.id, newChild);
    } else {
      const root = ensureRootForProject(selectedProject.rawId ?? projectId);
      root.expanded = true;
      root.children = [newChild];
      next = [...next, root];
    }

    setAllRows(next);
    scheduleSave(next, 150);
    setChildDraftTitle('');
  };

  const toggleExpand = useCallback((id) => {
    const rec = (nodes) =>
      nodes.map((n) => {
        if (n.id === id) return { ...n, expanded: !n.expanded };
        if (n.children?.length) return { ...n, children: rec(n.children) };
        return n;
      });
    setAllRows((prev) => rec(prev));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateNodeMeta = useCallback((nodes, id, patch) => {
    const rec = (arr) =>
      arr.map((n) => {
        if (n.id === id) return { ...n, ...patch };
        if (n.children?.length) return { ...n, children: rec(n.children) };
        return n;
      });
    return rec(nodes);
  }, []);

  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const setSelectedRows = useCallback((nextOrUpdater) => {
    setSelectedRowIds((prev) => {
      const prevList = Array.isArray(prev) ? prev : [];
      const rawNext = typeof nextOrUpdater === 'function' ? nextOrUpdater(prevList) : nextOrUpdater;
      return Array.from(new Set((Array.isArray(rawNext) ? rawNext : []).map((id) => String(id))));
    });
  }, []);

  const [editRowModal, setEditRowModal] = useState({
    open: false,
    rowId: null,
    targetIds: [],
    bulk: false,
    title: '',
    desc: '',
    isOther: false,
    isOtherRoot: false,
  });

  const openEditRowModal = (row) => {
    const clickedId = String(row?.id || '');
    const shouldEditSelected =
      selectedRowIds.length > 1 && selectedRowIds.some((id) => String(id) === clickedId);
    const targetIds = shouldEditSelected ? selectedRowIds.map((id) => String(id)) : [clickedId];
    const targetNodes = targetIds.map((id) => findNodeById(allRows, id)).filter(Boolean);
    if (!targetNodes.length) return;

    const first = targetNodes[0];
    const isBulk = targetNodes.length > 1;
    const baseTitle = first?.title || '';
    setEditRowModal({
      open: true,
      rowId: first?.id || null,
      targetIds: targetNodes.map((n) => String(n.id)),
      bulk: isBulk,
      title: baseTitle || '',
      desc: isBulk ? '' : (first?.desc || ''),
      isOther: !!first?.isOther,
      isOtherRoot: !!first?.otherRoot,
    });
  };

  const closeEditRowModal = () =>
    setEditRowModal({
      open: false,
      rowId: null,
      targetIds: [],
      bulk: false,
      title: '',
      desc: '',
      isOther: false,
      isOtherRoot: false,
    });

  const saveEditRowModal = () => {
    const targetIds = Array.isArray(editRowModal.targetIds)
      ? editRowModal.targetIds.map((id) => String(id)).filter(Boolean)
      : [];
    if (!targetIds.length && editRowModal.rowId) targetIds.push(String(editRowModal.rowId));
    if (!targetIds.length) {
      closeEditRowModal();
      return;
    }

    const isBulk = targetIds.length > 1;
    const oldNode = findNodeById(allRows, targetIds[0]);
    const oldTitle = String(oldNode?.title || '').trim();
    const newTitle = String(editRowModal.title || '').trim();
    const canEditTitle = !isBulk && editRowModal.isOther && !editRowModal.isOtherRoot;

    const patch = { desc: editRowModal.desc };
    if (canEditTitle) {
      patch.title = newTitle;
    }

    setAllRows((prev) => {
      let next = prev;
      targetIds.forEach((id) => {
        next = updateNodeMeta(next, id, patch);
      });
      scheduleSave(next, 150);
      return next;
    });

    // ✅ اگر "سایر" بود و عنوان تغییر کرد، کلید انتخاب هم آپدیت شود تا آیتم غیب نشود
    if (canEditTitle && oldTitle && newTitle && oldTitle !== newTitle) {
      const oldK = otherKeyFromTitle(oldTitle);
      const newK = otherKeyFromTitle(newTitle);
      setSelectedKeysArr((prev) => {
        const mapped = prev.map((k) => (k === oldK ? newK : k));
        const next = Array.from(new Set(mapped));
        metaRef.current = {
          ...(metaRef.current || {}),
          poolProjectIds: (metaRef.current?.poolProjectIds ?? poolProjectIds ?? []),
          selectedKeysArr: next,
        };
        return next;
      });
    }

    closeEditRowModal();
  };

  const [editingCell, setEditingCell] = useState({
    rowId: null,
    monthKey: '',
    value: '',
  });
  const editingInputRef = useRef(null);
  const skipBlurSaveRef = useRef(false);

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

  const startInlineEdit = (row, monthKey) => {
    if (hasChildren(row)) return;
    const rawVal = Number(row.months?.[monthKey] || 0);
    setEditingCell({
      rowId: row.id,
      monthKey,
      value: rawVal ? formatMoney(rawVal) : '',
    });
  };

  const closeInlineEdit = () => {
    setEditingCell({
      rowId: null,
      monthKey: '',
      value: '',
    });
  };

  const handleInlineEditChange = (raw) => {
    const en = toEnDigits(raw);
    const digits = en.replace(/[^\d]/g, '');
    const formatted = digits ? formatMoney(Number(digits)) : '';
    setEditingCell((prev) => ({ ...prev, value: formatted }));
  };

  const saveInlineEdit = () => {
    if (!editingCell.rowId || !editingCell.monthKey) {
      return;
    }
    const num = parseMoney(editingCell.value);

    setAllRows((prev) => {
      const next = updateNodeMonths(prev, editingCell.rowId, editingCell.monthKey, num);
      scheduleSave(next, 150);
      return next;
    });

    closeInlineEdit();
  };

  useEffect(() => {
    if (editingCell.rowId && editingInputRef.current) {
      editingInputRef.current.focus();
      editingInputRef.current.select();
    }
  }, [editingCell.rowId, editingCell.monthKey]);

  useEffect(() => {
    if (!editingCell.rowId) skipBlurSaveRef.current = false;
  }, [editingCell.rowId]);

  const displayRows = useMemo(() => {
    const out = [];

    const walk = (node, depth, indexPath) => {
      out.push({ type: 'node', node, depth, indexPath });

      if (node.expanded) {
        const children = node.children || [];
        children.forEach((ch, i) => walk(ch, depth + 1, [...indexPath, i + 1]));
      }
    };

   (visibleRoots || []).slice().reverse().forEach((r, i) => walk(r, 0, [i + 1]));

    return out;
  }, [visibleRoots]);

  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil((displayRows.length || 0) / (pageSize || 1)));
    if (page > totalPages - 1) setPage(totalPages - 1);
  }, [displayRows.length, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalRows = displayRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / (pageSize || 1)));
  const startIdx = totalRows === 0 ? 0 : page * pageSize;
  const endIdx = Math.min(totalRows, startIdx + pageSize);
  const pageRows = displayRows.slice(startIdx, endIdx);

  const allRowIds = useMemo(
    () => displayRows.map((x) => String(x?.node?.id ?? '')).filter(Boolean),
    [displayRows]
  );

  const visibleRowIds = useMemo(
    () => pageRows.map((x) => String(x?.node?.id ?? '')).filter(Boolean),
    [pageRows]
  );

  const selectedRowSet = useMemo(
    () => new Set((selectedRowIds || []).map((id) => String(id))),
    [selectedRowIds]
  );

  const selectedVisibleCount = useMemo(() => {
    if (!visibleRowIds.length) return 0;
    return visibleRowIds.reduce((acc, id) => (selectedRowSet.has(id) ? acc + 1 : acc), 0);
  }, [visibleRowIds, selectedRowSet]);

  const allVisibleRowsSelected =
    visibleRowIds.length > 0 && selectedVisibleCount === visibleRowIds.length;
  const someVisibleRowsSelected =
    selectedVisibleCount > 0 && selectedVisibleCount < visibleRowIds.length;

  const toggleRowSelect = (rowId) => {
    const sid = String(rowId);
    setSelectedRows((prev) => {
      const set = new Set((prev || []).map((id) => String(id)));
      if (set.has(sid)) set.delete(sid);
      else set.add(sid);
      return Array.from(set);
    });
  };

  const toggleSelectAllVisibleRows = () => {
    if (!visibleRowIds.length) return;
    if (allVisibleRowsSelected) {
      setSelectedRows((prev) =>
        (prev || []).filter((id) => !visibleRowIds.includes(String(id)))
      );
      return;
    }
    setSelectedRows((prev) => {
      const set = new Set((prev || []).map((id) => String(id)));
      visibleRowIds.forEach((id) => set.add(String(id)));
      return Array.from(set);
    });
  };

  useEffect(() => {
    if (!allRowIds.length) {
      if (selectedRowIds.length) setSelectedRows([]);
      return;
    }
    const visibleSet = new Set(allRowIds.map((id) => String(id)));
    setSelectedRows((prev) => (prev || []).filter((id) => visibleSet.has(String(id))));
  }, [allRowIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const removeNodesByIds = useCallback((nodes, idSet) => {
    const rec = (arr) =>
      (arr || []).reduce((acc, n) => {
        const sid = String(n?.id ?? '');
        if (sid && idSet.has(sid)) return acc;
        const nextChildren = Array.isArray(n?.children) ? rec(n.children) : [];
        if (Array.isArray(n?.children)) acc.push({ ...n, children: nextChildren });
        else acc.push(n);
        return acc;
      }, []);
    return rec(nodes || []);
  }, []);

  const removeRows = (ids) => {
    const uniqIds = Array.from(
      new Set(
        (Array.isArray(ids) ? ids : [ids])
          .map((id) => String(id || '').trim())
          .filter(Boolean)
      )
    );
    if (!uniqIds.length) return;
    const confirmText =
      uniqIds.length > 1 ? `حذف ${uniqIds.length} ردیف انتخاب‌شده؟` : 'حذف این ردیف؟';
    if (!window.confirm(confirmText)) return;

    const idSet = new Set(uniqIds);
    setAllRows((prev) => {
      const next = removeNodesByIds(prev, idSet);
      scheduleSave(next, 150);
      return next;
    });

    setSelectedRows((prev) => (prev || []).filter((id) => !idSet.has(String(id))));

    if (editingCell.rowId && idSet.has(String(editingCell.rowId))) {
      closeInlineEdit();
    }

    if (editRowModal.open) {
      const modalTargets = Array.isArray(editRowModal.targetIds)
        ? editRowModal.targetIds.map((id) => String(id))
        : (editRowModal.rowId ? [String(editRowModal.rowId)] : []);
      if (modalTargets.some((id) => idSet.has(String(id)))) {
        closeEditRowModal();
      }
    }
  };

  const indexLabel = (pathArr) => {
    if (!pathArr?.length) return '';
    const cleaned = pathArr.filter((x) => x !== 0);
    return cleaned.join('.');
  };

  const tableUi = tablePreset.table;
  const rowUi = tablePreset.row;
  const mainTotalCols = 3 + dynamicMonths.length + 1;
  const previewTotalCols = 2 + dynamicMonths.length + 1;
  const PagerBtn = ({ disabled, onClick, direction }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-10 w-10 grid place-items-center rounded-xl bg-transparent
                 hover:bg-black/5 active:bg-black/10 disabled:opacity-40 disabled:cursor-not-allowed
                 dark:hover:bg-white/10 dark:active:bg-white/15"
      aria-label={direction === 'prev' ? 'صفحه قبل' : 'صفحه بعد'}
      title={direction === 'prev' ? 'صفحه قبل' : 'صفحه بعد'}
    >
      {direction === 'prev' ? (
        <svg className="w-5 h-5 text-black/70 dark:text-neutral-200" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M10.7 6.3a1 1 0 0 1 1.4 0l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 1 1-1.4-1.4L15.29 12 10.7 7.7a1 1 0 0 1 0-1.4z"
          />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-black/70 dark:text-neutral-200" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M13.3 17.7a1 1 0 0 1-1.4 0l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 1 1 1.4 1.4L8.71 12l4.59 4.3a1 1 0 0 1 0 1.4z"
          />
        </svg>
      )}
    </button>
  );

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

  const exportExcel = async () => {
    const dash = "-";
    const title = "\u0628\u0631\u0622\u0648\u0631\u062F \u062F\u0631\u0622\u0645\u062F \u0647\u0627";
    const exportDate = new Date().toLocaleDateString("fa-IR");

    const headers = [
      "#",
      "\u067E\u0631\u0648\u0698\u0647 / \u0645\u0648\u0631\u062F",
      ...dynamicMonths.map((m) => String(m?.label || "").trim() || dash),
      "\u062C\u0645\u0639",
    ];

    const rowsForExcel = [];
    const walkExcel = (node, depth, indexPath) => {
      rowsForExcel.push({
        node,
        depth,
        indexPath,
        isParent: hasChildren(node),
      });
      (node?.children || []).forEach((ch, i) => walkExcel(ch, depth + 1, [...indexPath, i + 1]));
    };
    (visibleRoots || []).forEach((r, i) => walkExcel(r, 0, [i + 1]));

    const bodyRows = rowsForExcel.map((x, i) => {
      const r = x.node || {};
      const depth = Math.max(0, Number(x.depth || 0));
      const rowTotal = sumNodeMonths(r);
      const titleCell =
        depth === 0 && r?.projectId != null
          ? getProjectLabelById(r.projectId, normalizeFaText(r.title || "") || dash)
          : normalizeFaText(r.title || "") || dash;

      const indexCell = toFaDigits(indexLabel(x.indexPath) || (i + 1));
      const indentMarker = depth > 0 ? `${"  ".repeat(depth)}\u21B3 ` : "";

      const monthCells = dynamicMonths.map((m) => {
        const val = sumNodeMonth(r, m.key);
        return val ? toFaDigits(formatMoney(val)) : dash;
      });

      return [
        indexCell,
        `${indentMarker}${titleCell}`,
        ...monthCells,
        rowTotal ? toFaDigits(formatMoney(rowTotal)) : dash,
      ];
    });

    const footerRow = [
      dash,
      "\u062C\u0645\u0639",
      ...dynamicMonths.map((m) => {
        const v = totalsByMonth[m.key];
        return v ? toFaDigits(formatMoney(v)) : dash;
      }),
      totalGrand ? toFaDigits(formatMoney(totalGrand)) : dash,
    ];

    const rowsSection = bodyRows.length
      ? bodyRows
      : [[dash, "\u0645\u0648\u0631\u062F\u06CC \u0628\u0631\u0627\u06CC \u0646\u0645\u0627\u06CC\u0634 \u0646\u06CC\u0633\u062A.", ...dynamicMonths.map(() => dash), dash]];

    const metaRows = [[title], [`\u062A\u0627\u0631\u06CC\u062E \u062E\u0631\u0648\u062C\u06CC: ${exportDate}`]];
    const sheetData = [...metaRows, [], headers, ...rowsSection, footerRow];

    const xlsxMod = await import("xlsx");
    const XLSX = xlsxMod?.default || xlsxMod;

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws["!cols"] = [
      { wch: 7 },
      { wch: 48 },
      ...dynamicMonths.map(() => ({ wch: 16 })),
      { wch: 18 },
    ];

    const headerRowIndex = metaRows.length + 1;
    ws["!rows"] = Array.from({ length: sheetData.length }, (_, i) => {
      if (i < metaRows.length) return { hpt: 22 };
      if (i === metaRows.length) return { hpt: 8 };
      if (i === headerRowIndex) return { hpt: 20 };
      return { hpt: 18 };
    });

    const lastColIndex = headers.length - 1;
    ws["!merges"] = metaRows.map((_, i) => ({
      s: { r: i, c: 0 },
      e: { r: i, c: lastColIndex },
    }));

    const lastCol = XLSX.utils.encode_col(lastColIndex);
    const headerRowNum = headerRowIndex + 1;
    const lastRowNum = sheetData.length;
    ws["!autofilter"] = { ref: `A${headerRowNum}:${lastCol}${lastRowNum}` };

    const wb = XLSX.utils.book_new();
    wb.Workbook = wb.Workbook || {};
    wb.Workbook.Views = [{ RTL: true }];
    XLSX.utils.book_append_sheet(wb, ws, "RevenueEstimates");

    XLSX.writeFile(wb, "revenue-estimates.xlsx", {
      bookType: "xlsx",
      compression: true,
    });
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

  const otherRootNow = getOtherRoot(allRows);
  const otherChildrenNow = (otherRootNow?.children || [])
    .map((ch) => normalizeTitleText(ch?.title || ''))
    .filter(Boolean);
  const editModalTargetCount = Array.isArray(editRowModal.targetIds) && editRowModal.targetIds.length
    ? editRowModal.targetIds.length
    : (editRowModal.rowId ? 1 : 0);
  const isBulkEditModal = editModalTargetCount > 1;
  const canEditModalTitle = !isBulkEditModal && editRowModal.isOther && !editRowModal.isOtherRoot;

  return (
    <>
      <Card>
        <div className="mb-3 text-black/70 dark:text-neutral-300 text-base md:text-lg">
          <span>بودجه‌بندی</span>
          <span className="mx-2">›</span>
          <span className="font-semibold text-black dark:text-neutral-100">برآورد درآمد ها</span>
        </div>

        <div>
          <div className="rounded-2xl border border-black/10 dark:border-neutral-700 bg-white dark:bg-neutral-900 py-3">
            <div className="px-[15px]">
              <div className="grid grid-cols-1 md:grid-cols-[minmax(220px,320px)_1fr_auto] gap-2 items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-black/60 dark:text-neutral-400">انتخاب پروژه</label>
                  <select
                    value={childParentId}
                    onChange={(e) => {
                      setChildParentId(e.target.value);
                      if (childDraftErr) setChildDraftErr('');
                    }}
                    className="h-10 rounded-xl border border-black/15 bg-white text-black px-3 text-sm outline-none
                      focus:ring-2 focus:ring-black/10 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                  >
                    <option value="">انتخاب پروژه...</option>
                    {selectedProjectTargets.map((item) => (
                      <option key={`target-${item.id}`} value={String(item.id)}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-black/60 dark:text-neutral-400">عنوان زیرمجموعه جدید</label>
                  <input
                    value={childDraftTitle}
                    onChange={(e) => {
                      setChildDraftTitle(e.target.value);
                      if (childDraftErr) setChildDraftErr('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddChildFromPanel();
                      }
                    }}
                    placeholder="مثلاً تجهیز کارگاه، فروش مرحله‌ای، ..."
                    className="h-10 rounded-xl border border-black/15 bg-white text-black px-3 text-sm outline-none
                      focus:ring-2 focus:ring-black/10 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddChildFromPanel}
                  disabled={!childParentId || !String(childDraftTitle || '').trim()}
                  className="h-10 w-full md:w-12 rounded-xl bg-black text-white grid place-items-center transition disabled:opacity-40 disabled:cursor-not-allowed dark:bg-neutral-100 dark:text-neutral-900"
                  aria-label="افزودن زیرمجموعه"
                  title="افزودن زیرمجموعه"
                >
                  <img src="/images/icons/afzodan.svg" alt="" className="w-5 h-5 invert dark:invert-0" />
                </button>
              </div>

              {childDraftErr && <div className="mt-2 text-xs text-red-600 dark:text-red-400">{childDraftErr}</div>}
            </div>

            {/* جدول اصلی */}
            <div className="mt-3">
          <TableWrap>
            <div className={tableUi.outer}>
              <div className={tableUi.innerPad}>
                <div className={tableUi.frame + ' shadow-sm'}>
                  <div className="max-h-[520px] overflow-auto overscroll-x-contain">
                    <table
                      className={tableUi.table + ' table-fixed text-[11px] md:text-[12px] leading-tight min-w-[900px] lg:min-w-[1040px]'}
                      dir="rtl"
                    >
                      <THead>
                        <tr className={`sticky top-0 z-20 ${tableUi.headRow}`}>
                          <TH className={`${tablePreset.columns.select} ${tableUi.th}`}>
                            <input
                              type="checkbox"
                              className={rowUi.checkbox}
                              checked={allVisibleRowsSelected}
                              ref={(el) => {
                                if (el) el.indeterminate = someVisibleRowsSelected;
                              }}
                              onChange={toggleSelectAllVisibleRows}
                              aria-label="انتخاب همه"
                              title="انتخاب همه"
                            />
                          </TH>
                          <TH className={`${tablePreset.columns.index} ${tableUi.th}`}>#</TH>
                          <TH className={`w-64 lg:w-72 ${tableUi.th}`}>پروژه / مورد</TH>
                      {dynamicMonths.map((m) => (
                        <TH key={m.key} className={`w-24 px-0 ${tableUi.th}`}>
                          {m.label}
                        </TH>
                      ))}
                      <TH className={`w-28 border-l border-r border-black/10 dark:border-neutral-700 ${tableUi.th}`}>
                        جمع
                      </TH>
                        </tr>
                      </THead>

                      <tbody className={tableUi.body}>
                    {visibleRoots.length > 0 && (
                      <TR className="text-center bg-black/[0.035] font-semibold dark:bg-white/10">
                        <TD className="px-2 py-2 border-b border-black/10 dark:border-neutral-800">-</TD>
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

                    {pageRows.map((x, idx) => {
                      const r = x.node;
                      const level = x.depth || 0;
                      const indentRight = level === 0 ? 8 : 30 + level * 26;
                      const rowTotal = sumNodeMonths(r);
                      const isProjectRoot = level === 0 && r?.projectId != null && r?.isOther !== true;
                      const isComputed = hasChildren(r) || isProjectRoot;
                      const titleTextClass = isProjectRoot ? 'text-[14px] md:text-[15px]' : 'text-[13px] md:text-[14px]';
                      const idxText = indexLabel(x.indexPath);
                      const rowId = String(r.id);
                      const isSelected = selectedRowSet.has(rowId);
                      const shouldDeleteSelectedOnAction = isSelected && selectedRowIds.length > 1;

                      const displayTitle =
                        r.isOther
                          ? (normalizeFaText(r.title || '') || '—')
                          : (x.depth === 0 && r?.projectId != null
                              ? getProjectLabelById(r.projectId, normalizeFaText(r.title || '') || '—')
                              : (normalizeFaText(r.title || '') || '—'));

                      return (
                        <TR
                          key={r.id}
                          className={getHoverSelectableRowClass(isSelected)}
                        >
                          <TD className="px-2 py-2">
                            <input
                              type="checkbox"
                              className={rowUi.checkbox}
                              checked={isSelected}
                              onChange={() => toggleRowSelect(rowId)}
                              aria-label="انتخاب ردیف"
                              title="انتخاب ردیف"
                            />
                          </TD>
                          <TD className="px-2 py-2">{toFaDigits(idxText || (startIdx + idx + 1))}</TD>

                          <TD className="relative pl-10 py-2 text-right overflow-hidden" style={{ paddingRight: indentRight }}>
                            <div className="flex w-full min-w-0 items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isComputed) toggleExpand(r.id);
                                  else openEditRowModal(r);
                                }}
                                className={`flex-1 min-w-0 truncate px-1 py-0.5 text-right ${titleTextClass} ${isComputed ? 'font-semibold hover:underline' : 'hover:underline'}`}
                                title={isComputed ? 'باز/بسته کردن زیرمجموعه‌ها' : 'افزودن/ویرایش توضیحات'}
                              >
                                {displayTitle}
                              </button>

                              {isComputed && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(r.id)}
                                  className="h-5 w-5 shrink-0 grid place-items-center rounded-md border border-black/25 bg-white text-black dark:border-neutral-500 dark:bg-white dark:text-black"
                                  aria-label={r.expanded ? 'بستن زیرمجموعه' : 'باز کردن زیرمجموعه'}
                                  title={r.expanded ? 'بستن زیرمجموعه' : 'باز کردن زیرمجموعه'}
                                >
                                  {r.expanded ? (
                                    <span className="text-[11px] leading-none text-black">−</span>
                                  ) : (
                                    <img src="/images/icons/afzodan.svg" alt="" className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>
                          </TD>

                          {dynamicMonths.map((m) => {
                            const val = sumNodeMonth(r, m.key);
                            const hasVal = !!val;
                            const isEditing =
                              !isComputed &&
                              String(editingCell.rowId || '') === String(r.id || '') &&
                              editingCell.monthKey === m.key;
                            return (
                              <TD key={m.key} className="px-0 py-2 text-center align-middle">
                                {isEditing ? (
                                  <input
                                    ref={editingInputRef}
                                    dir="ltr"
                                    value={editingCell.value ? toFaDigits(editingCell.value) : ''}
                                    onChange={(e) => handleInlineEditChange(e.target.value)}
                                    onBlur={() => {
                                      if (skipBlurSaveRef.current) {
                                        skipBlurSaveRef.current = false;
                                        return;
                                      }
                                      saveInlineEdit();
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        skipBlurSaveRef.current = true;
                                        saveInlineEdit();
                                      }
                                      if (e.key === 'Escape') {
                                        e.preventDefault();
                                        skipBlurSaveRef.current = true;
                                        closeInlineEdit();
                                      }
                                    }}
                                    className="w-24 mx-auto h-9 md:w-24 md:h-9 rounded-xl border text-[11px] md:text-[12px] text-center bg-white text-black border-black/20 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-600 outline-none ring-2 ring-black/10 dark:ring-white/20"
                                    placeholder="0"
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => startInlineEdit(r, m.key)}
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
                                )}
                              </TD>
                            );
                          })}

                          <TD className="px-3 py-2 whitespace-nowrap text-center border-l border-r border-black/10 dark:border-neutral-700">
                            <div className="relative flex min-h-[34px] items-center justify-center">
                              <span
                                className={`inline-flex items-center justify-center gap-1 transition-opacity ${
                                  isSelected
                                    ? 'opacity-0 pointer-events-none'
                                    : 'opacity-100 group-hover:opacity-0 group-hover:pointer-events-none'
                                }`}
                              >
                                <span className="ltr">{toFaDigits(formatMoney(rowTotal || 0))}</span>
                                <span>ریال</span>
                              </span>

                              <div
                                className={`absolute inset-0 flex items-center justify-center gap-1 transition-opacity ${
                                  isSelected
                                    ? 'opacity-100 pointer-events-auto'
                                    : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto'
                                }`}
                              >
                                <RowActionIconBtn
                                  action="edit"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    openEditRowModal(r);
                                  }}
                                  size={34}
                                  iconSize={15}
                                />
                                <RowActionIconBtn
                                  action="delete"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (shouldDeleteSelectedOnAction) {
                                      removeRows(selectedRowIds);
                                      return;
                                    }
                                    removeRows([r.id]);
                                  }}
                                  size={34}
                                  iconSize={16}
                                />
                              </div>
                            </div>
                          </TD>
                        </TR>
                      );
                    })}

                    {visibleRoots.length === 0 && (
                      <TR>
                        <TD colSpan={mainTotalCols} className={tableUi.emptyRow}>
                          برای شروع، یک پروژه انتخاب کنید و یک زیرمجموعه جدید ثبت کنید.
                        </TD>
                      </TR>
                    )}
                      </tbody>
                    </table>
                  </div>

                  <div className="border-t border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                    <div className="px-3 py-2 flex items-center justify-between gap-3" dir="rtl">
                      <div className="flex items-center gap-2">
                        <PagerBtn
                          direction="prev"
                          disabled={page <= 0}
                          onClick={() => setPage((p) => Math.max(0, p - 1))}
                        />
                        <PagerBtn
                          direction="next"
                          disabled={page >= totalPages - 1}
                          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        />
                        <div className="text-sm text-black/70 dark:text-neutral-300">
                          {totalRows === 0
                            ? '۰ از ۰'
                            : `${toFaDigits(startIdx + 1)}–${toFaDigits(endIdx)} از ${toFaDigits(totalRows)}`}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-black/70 dark:text-neutral-300">تعداد در هر صفحه:</span>
                        <select
                          value={pageSize}
                          onChange={(e) => {
                            const v = Number(e.target.value) || 25;
                            setPageSize(v);
                            setPage(0);
                          }}
                          className="h-10 rounded-xl px-3 bg-white text-black border border-black/15
                                   dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                        >
                          <option value={25}>۲۵</option>
                          <option value={50}>۵۰</option>
                          <option value={100}>۱۰۰</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TableWrap>
            </div>
          </div>
        </div>

        {/* دکمه ذخیره دستی (اختیاری) */}
        <div className="mt-4 flex items-center gap-2 justify-end">
          <button
            onClick={exportExcel}
            disabled={displayRows.length === 0}
            className="h-10 w-10 rounded-xl border border-black/15 hover:bg-black/5 grid place-items-center transition disabled:opacity-40 disabled:cursor-not-allowed dark:border-neutral-700 dark:hover:bg-neutral-800"
            aria-label="خروجی اکسل"
            title="خروجی اکسل"
          >
            <img src="/images/icons8-excel-50.png" alt="" className="w-5 h-5" />
          </button>

          <button
            onClick={handleSave}
            className="h-10 w-10 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 grid place-items-center disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="ذخیره دستی"
            title="ذخیره دستی"
          >
            <img src="/images/icons/check.svg" alt="" className="w-5 h-5 invert dark:invert-0" />
          </button>
        </div>

        {/* مودال مدیریت سایر (تماماً سفید در لایت و با بک‌دراپ، تا جدول پشتش دیده نشود) */}
        {otherMenuOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center px-3">
            <div
              className="absolute inset-0 bg-black/25 dark:bg-neutral-950/55 backdrop-blur-[2px]"
              onClick={() => setOtherMenuOpen(false)}
            />
            <div
              className="relative w-full max-w-md rounded-2xl bg-white text-black border border-black/10 shadow-2xl p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">افزودن / مدیریت مورد جدید</div>
                  <div className="mt-1 text-xs text-black/60">
                    عنوان را وارد کنید و با دکمه تیک اضافه کنید.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOtherMenuOpen(false)}
                  className="h-8 w-8 grid place-items-center rounded-xl bg-black text-white"
                  aria-label="بستن"
                  title="بستن"
                >
                  <img src="/images/icons/bastan.svg" alt="" className="w-4 h-4 invert" />
                </button>
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex items-stretch gap-2">
                  <input
                    ref={otherTitleRef}
                    type="text"
                    className="flex-1 rounded-xl px-3 py-2 text-sm bg-white text-black placeholder-black/40 border border-black/15 outline-none focus:ring-2 focus:ring-black/10"
                    value={otherDraftTitle}
                    onChange={(e) => {
                      setOtherDraftTitle(e.target.value);
                      if (otherDraftErr) setOtherDraftErr('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddOtherFromModal();
                      }
                    }}
                    placeholder="عنوان مورد جدید..."
                  />
                  <button
                    type="button"
                    onClick={handleAddOtherFromModal}
                    className="h-10 w-11 rounded-xl bg-black text-white grid place-items-center"
                    aria-label="افزودن"
                    title="افزودن"
                  >
                    <img src="/images/icons/check.svg" alt="" className="w-5 h-5 invert" />
                  </button>
                </div>

                {otherDraftErr && (
                  <div className="text-xs text-red-600">{otherDraftErr}</div>
                )}

                <div className="mt-2 text-xs text-black/60">لیست موارد:</div>

                {otherChildrenNow.length === 0 && (
                  <div className="px-2 py-2 text-xs text-black/50">
                    فعلاً موردی ندارید.
                  </div>
                )}

                <div className="max-h-60 overflow-auto space-y-1">
                  {otherChildrenNow.map((t) => {
                    const active = selectedOtherSet.has(t);
                    return (
                      <div
                        key={t}
                        className={`flex items-center justify-between gap-2 rounded-xl px-2 py-2 transition border border-black/10
                          ${active ? 'bg-black/[0.03]' : 'hover:bg-black/[0.02]'}`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleOtherChild(t)}
                          className="flex-1 text-right text-xs"
                          title={active ? 'حذف از جدول' : 'افزودن به جدول'}
                        >
                          <span className="inline-flex items-center gap-2">
                            <span className={`h-4 w-4 rounded border grid place-items-center
                              ${active ? 'bg-black text-white border-black' : 'bg-white border-black/20'}`}>
                              {active ? (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              ) : null}
                            </span>
                            <span className="truncate">{t}</span>
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteOtherChild(t)}
                          className="h-8 w-8 grid place-items-center rounded-xl ring-1 ring-black/10 hover:bg-black/5"
                          aria-label="حذف مورد"
                          title="حذف مورد"
                        >
                          <img src="/images/icons/bastan.svg" alt="" className="w-3 h-3 invert-0" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setOtherMenuOpen(false)}
                    className="h-9 px-4 rounded-xl border border-black/15 text-xs hover:bg-black/5"
                  >
                    بستن
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const titles = otherChildrenNow;
                      if (!titles.length) return;
                      const anySelected = titles.some((t) => selectedOtherSet.has(t));
                      if (anySelected) {
                        setSelectedKeysArr((prev) => {
                          const next = prev.filter((k) => !String(k).startsWith('o:'));
                          metaRef.current = {
                            ...(metaRef.current || {}),
                            poolProjectIds: (metaRef.current?.poolProjectIds ?? poolProjectIds ?? []),
                            selectedKeysArr: next,
                          };
                          return next;
                        });
                      } else {
                        setSelectedKeysArr((prev) => {
                          const s = new Set(prev);
                          titles.forEach((t) => s.add(otherKeyFromTitle(t)));
                          const next = Array.from(s);
                          metaRef.current = {
                            ...(metaRef.current || {}),
                            poolProjectIds: (metaRef.current?.poolProjectIds ?? poolProjectIds ?? []),
                            selectedKeysArr: next,
                          };
                          return next;
                        });
                      }
                      scheduleSave(allRows || [], 150);
                    }}
                    className="h-9 px-4 rounded-xl bg-black text-white text-xs"
                    title="انتخاب/لغو انتخاب همه"
                  >
                    انتخاب همه
                  </button>
                </div>
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
                  <div className="text-sm font-semibold">
                    {isBulkEditModal
                      ? 'ویرایش گروهی'
                      : (canEditModalTitle ? 'ویرایش مورد' : 'جزئیات / توضیحات')}
                  </div>
                  <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {isBulkEditModal
                      ? 'توضیحات روی همه موارد انتخاب‌شده اعمال می‌شود.'
                      : (canEditModalTitle ? 'عنوان و توضیحات مورد را ثبت کنید.' : 'در صورت نیاز، توضیحات را ثبت کنید.')}
                  </div>
                </div>
                <button type="button" onClick={closeEditRowModal} className="h-8 w-8 grid place-items-center rounded-xl bg-black text-white dark:bg-neutral-100 dark:text-neutral-900">
                  <img src="/images/icons/bastan.svg" alt="" className="w-4 h-4 invert dark:invert-0" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-xs text-neutral-600 dark:text-neutral-300">عنوان</label>

                  {canEditModalTitle ? (
                    <input
                      type="text"
                      className="w-full rounded-xl px-3 py-2 text-sm bg-white text-black placeholder-black/40 border border-black/15 outline-none focus:ring-2 focus:ring-black/10 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                      value={editRowModal.title}
                      onChange={(e) => setEditRowModal((p) => ({ ...p, title: e.target.value }))}
                      placeholder="عنوان دلخواه را وارد کنید"
                    />
                  ) : (
                    <div className="mt-1 w-full rounded-xl px-3 py-2 text-sm bg-black/[0.02] text-black border border-black/10 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700">
                      {isBulkEditModal
                        ? `${toFaDigits(editModalTargetCount)} مورد انتخاب شده`
                        : (editRowModal.title || '—')}
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
                  disabled={canEditModalTitle ? !editRowModal.title.trim() : false}
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
                  <table className="w-full min-w-[860px] md:min-w-[980px] table-fixed text-[11px] md:text-xs text-center [&_th]:text-center [&_td]:text-center">
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
                          <td colSpan={previewTotalCols} className="py-6 text-black/60 dark:text-neutral-400 text-center">موردی برای نمایش نیست.</td>
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
