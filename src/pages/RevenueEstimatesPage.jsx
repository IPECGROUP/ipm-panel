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
  baseCurrenciesTablePreset as tablePreset,
  hoverSelectableRowPreset,
  getHoverSelectableRowClass,
} from '../components/ui/tablePresets';

function RevenueEstimatesPage() {
  // This page is intentionally open for any authenticated user (no page-level access check).
  const me = {};
  const accessLoading = false;
  const canAccessPage = true;

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
  return String(p?.code ?? '').trim();
}, []);

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

    const na = String(a?.name ?? a?.title ?? '').trim();
    const nb = String(b?.name ?? b?.title ?? '').trim();
    return na.localeCompare(nb, 'fa', { numeric: true, sensitivity: 'base' });
  });

}, [projects, getProjectCode]);

const getProjectLabel = useCallback((p) => {
  const code = String(p?.code ?? '').trim();
  const name = String(p?.name ?? '').trim();
  if (code && name) return `${code} - ${name}`;
  return code || name || 'پروژه بدون نام';
}, []);

const projectOptionLabel = useCallback((p) => {
  const code = toFaDigits(String(p?.code ?? '').trim());
  const name = String(p?.name ?? '').trim();
  if (code && name) return `${code} - ${name}`;
  return code || name || '—';
}, [toFaDigits]);

  const getProjectLabelById = useCallback(
    (pid, fallback = '') => {
      const p = projectById.get(String(pid));
      return p ? getProjectLabel(p) : (fallback || '—');
    },
    [projectById, getProjectLabel]
  );

  const SEP = ' › ';

  // ===== انتخاب‌ها (کپسول‌ها) =====

  const [otherMenuOpen, setOtherMenuOpen] = useState(false);

  const projectKey = (pid) => `p:${String(pid)}`;
  const otherKeyFromTitle = (t) => `o:${encodeURIComponent(String(t || '').trim())}`;
  const otherTitleFromKey = (k) => {
    try {
      return decodeURIComponent(String(k || '').slice(2));
    } catch {
      return String(k || '').slice(2);
    }
  };

  const selectedKeys = useMemo(() => new Set(selectedKeysArr), [selectedKeysArr]);

  const selectedOtherTitles = useMemo(() => {
    return selectedKeysArr
      .filter((k) => String(k).startsWith('o:'))
      .map((k) => otherTitleFromKey(k))
      .filter(Boolean);
  }, [selectedKeysArr]);

  const selectedOtherSet = useMemo(() => new Set(selectedOtherTitles), [selectedOtherTitles]);

  const poolKeys = useMemo(() => {
    const out = [];
    (poolProjectIds || []).forEach((pid) => out.push(projectKey(pid)));
    return out;
  }, [poolProjectIds]);

  const isAllSelected = useMemo(() => {
    if (!poolKeys.length) return false;
    for (const k of poolKeys) if (!selectedKeys.has(k)) return false;
    return true;
  }, [poolKeys, selectedKeys]);

  const ensureRootForProject = useCallback((pid) => {
    const spid = String(pid);
    const p = projectById.get(spid);
   const title = p ? getProjectLabel(p) : `پروژه ${String(spid)}`;

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

  const ensureOtherRoot = useCallback(() => {
    return makeNode({
      id: 'other-root',
      title: 'سایر',
      desc: '',
      projectId: null,
      months: {},
      children: [],
      expanded: true,
      isOther: true,
      otherRoot: true,
    });
  }, []);

  const getOtherRoot = useCallback((rows) => {
    return (rows || []).find((r) => r?.isOther && r?.otherRoot);
  }, []);

  const upsertOtherRoot = useCallback((rows) => {
    const ex = getOtherRoot(rows);
    if (ex) return rows;
    return [...(rows || []), ensureOtherRoot()];
  }, [ensureOtherRoot, getOtherRoot]);

  const visibleRoots = useMemo(() => {
    const keys = selectedKeys;
    const roots = (allRows || []).filter((r) => r && r.otherRoot !== true); // پروژه‌ها/غیره (به جز روت سایر)
    const out = [];

    // پروژه‌ها
    roots.forEach((r) => {
      const k = r?.projectId != null ? projectKey(r.projectId) : '';
      if (k && keys.has(k)) out.push(r);
    });

    // سایر (بدون نمایش روت "سایر"؛ فقط آیتم‌ها به‌صورت ریشه نمایش داده شوند)
    const otherRoot = (allRows || []).find((r) => r?.isOther && r?.otherRoot);
    if (otherRoot && selectedOtherSet.size > 0) {
      const filteredChildren = (otherRoot.children || []).filter((ch) => {
        const t = String(ch?.title || '').trim();
        return t && selectedOtherSet.has(t);
      });
      filteredChildren.forEach((ch) => out.push(ch));
    }

    return out;
  }, [allRows, selectedKeys, selectedOtherSet]);

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
        else if (isOther && seg0 === 'سایر') key = 'otherRoot';
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
        const rawTitle = String(it.title || '').trim(); // فقط title
        if (!rawTitle) return;
        if (rawTitle === '__META__') return;

        let parts = rawTitle.split(SEP).map((x) => x.trim()).filter(Boolean);
        if (!parts.length) return;

        const projectId = it.project_id ?? null;
        const isOther = it.is_other === true || it.isOther === true;

        // سایرها: همه زیر روت "سایر"
        if (isOther && projectId == null) {
          if (parts[0] !== 'سایر') parts = ['سایر', ...parts];
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

        node.desc = String(it.description || '');
        node.projectId = projectId != null ? projectId : node.projectId || null;
        node.months = monthsMap;
      });

      return Array.from(rootMap.values());
    },
    []
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
          const t = String(it?.title || '').trim();
          if (t === '__META__') {
            try {
              meta = JSON.parse(String(it?.description || '{}') || '{}');
            } catch {
              meta = null;
            }
            break;
          }
        }

        const itemsNoMeta = items.filter((x) => String(x?.title || '').trim() !== '__META__');

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
const otherTitles = (otherRoot?.children || []).map((ch) => String(ch?.title || '').trim()).filter(Boolean);

const defaultKeys = [
  ...nextPool.map((pid) => projectKey(pid)),
  ...otherTitles.map((t) => otherKeyFromTitle(t)),
];

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
  }, [buildTreeFromItems, canAccessPage, upsertOtherRoot, getOtherRoot]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const addToSelected = (k) => {
    setSelectedKeysArr((prev) => {
      const s = new Set(prev);
      s.add(k);
      const next = Array.from(s);
      metaRef.current = {
        ...(metaRef.current || {}),
        poolProjectIds: (metaRef.current?.poolProjectIds ?? poolProjectIds ?? []),
        selectedKeysArr: next,
      };
      return next;
    });
  };

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

  const toggleSelectAll = () => {
    if (!poolKeys.length) return;
    if (isAllSelected) {
      setSelectedKeysArr((prev) => {
        const next = prev.filter((k) => !String(k).startsWith('p:'));
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
        poolKeys.forEach((k) => s.add(k));
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
  };

  // هر تغییر انتخاب/کپسول‌ها هم باید ذخیره شود
  useEffect(() => {
    if (canAccessPage !== true) return;
    scheduleSave(allRows || [], 150);
  }, [selectedKeysArr, poolProjectIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== افزودن پروژه به کپسول‌ها =====
  const [pickedProjectId, setPickedProjectId] = useState('');

  const addPickedProject = () => {
    const pid = String(pickedProjectId || '');
    if (!pid) return;

    if (pid === '__ALL__') {
    const all = (projectsForPicker || [])
  .map((p) => String(p?.id ?? ''))
  .filter(Boolean);

      setPoolProjectIds((prev) => {
        const next = Array.from(new Set([...(prev || []), ...all]));
        metaRef.current = {
          ...(metaRef.current || {}),
          poolProjectIds: next,
          selectedKeysArr: (metaRef.current?.selectedKeysArr ?? selectedKeysArr ?? []),
        };
        return next;
      });
      setPickedProjectId('');
      return;
    }

    const exists = (poolProjectIds || []).includes(pid);
    if (exists) {
      setPickedProjectId('');
      return;
    }
    setPoolProjectIds((prev) => {
      const next = [...(prev || []), pid];
      metaRef.current = {
        ...(metaRef.current || {}),
        poolProjectIds: next,
        selectedKeysArr: (metaRef.current?.selectedKeysArr ?? selectedKeysArr ?? []),
      };
      return next;
    });
    setPickedProjectId('');
  };

  // ===== حذف پروژه از کپسول (بدون حذف دیتا) =====
  const removeProjectChip = (pid) => {
    const spid = String(pid);
    setPoolProjectIds((prev) => {
      const next = (prev || []).filter((x) => String(x) !== spid);
      metaRef.current = {
        ...(metaRef.current || {}),
        poolProjectIds: next,
        selectedKeysArr: (metaRef.current?.selectedKeysArr ?? selectedKeysArr ?? []),
      };
      return next;
    });
    removeFromSelected(projectKey(spid));
    scheduleSave(allRows || [], 150);
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

  const openOtherManager = () => {
    ensureOtherRootInState();
    setOtherDraftErr('');
    setOtherMenuOpen(true);
  };

  const addOtherChildWithTitle = (rawTitle) => {
  const title = String(rawTitle || '').trim();
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
      (ch) => String(ch?.title || '').trim() === title
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
    const t = String(otherDraftTitle || '').trim();
    if (!t) {
      setOtherDraftErr('عنوان را وارد کنید.');
      return;
    }

    const otherRoot = getOtherRoot(allRows);
    const exists = (otherRoot?.children || []).some((ch) => String(ch?.title || '').trim() === t);
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
    const t = String(title || '').trim();
    if (!t) return;
    toggleSelected(otherKeyFromTitle(t));
    scheduleSave(allRows || [], 150);
  };

  const deleteOtherChild = (title) => {
    const t = String(title || '').trim();
    if (!t) return;

    removeFromSelected(otherKeyFromTitle(t));

    setAllRows((prev) => {
      const rec = (arr) =>
        arr.map((n) => {
          if (n?.isOther && n?.otherRoot) {
            const nextChildren = (n.children || []).filter((ch) => String(ch?.title || '').trim() !== t);
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

  // ===== کلیک روی کپسول پروژه: اضافه/کم کردن از جدول اصلی =====
  const onToggleProjectChip = (pid) => {
    const k = projectKey(pid);
    const isOn = selectedKeys.has(k);

    if (!isOn) {
      setAllRows((prev) => {
        const exists = (prev || []).some((r) => String(r?.projectId) === String(pid));
        if (exists) return prev;
        const next = [...(prev || []), ensureRootForProject(pid)];
        scheduleSave(next, 150);
        return next;
      });
    }

    toggleSelected(k);
    scheduleSave(allRows || [], 150);
  };

  const selectedProjectTargets = useMemo(() => {
    return (allRows || [])
      .filter((r) => r?.projectId != null && selectedKeys.has(projectKey(r.projectId)))
      .map((r) => ({
        id: r.id,
        label: getProjectLabelById(r.projectId, r.title || '—'),
      }));
  }, [allRows, selectedKeys, getProjectLabelById]);

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
    const parentId = String(childParentId || '').trim();
    const title = String(childDraftTitle || '').trim();

    if (!parentId) {
      setChildDraftErr('ابتدا مقصد را از پروژه‌های انتخاب‌شده مشخص کنید.');
      return;
    }

    if (!title) {
      setChildDraftErr('عنوان زیرمجموعه را وارد کنید.');
      return;
    }

    const parentNode = findNodeById(allRows, parentId);
    if (!parentNode) {
      setChildDraftErr('مورد انتخاب‌شده پیدا نشد.');
      return;
    }

    const duplicate = (parentNode.children || []).some(
      (ch) => String(ch?.title || '').trim() === title
    );
    if (duplicate) {
      setChildDraftErr('این زیرمجموعه قبلاً ثبت شده است.');
      return;
    }

    setChildDraftErr('');
    const newChild = makeNode({
      id: rowIdRef.current++,
      title,
      desc: '',
      projectId: parentNode.projectId || null,
      months: {},
      children: [],
      expanded: false,
      isOther: !!parentNode.isOther,
      otherRoot: false,
    });

    setAllRows((prev) => {
      const next = addChildToTree(prev, parentId, newChild);
      scheduleSave(next, 150);
      return next;
    });
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

  const visibleRowIds = useMemo(
    () => displayRows.map((x) => String(x?.node?.id ?? '')).filter(Boolean),
    [displayRows]
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
    if (!visibleRowIds.length) {
      if (selectedRowIds.length) setSelectedRows([]);
      return;
    }
    const visibleSet = new Set(visibleRowIds.map((id) => String(id)));
    setSelectedRows((prev) => (prev || []).filter((id) => visibleSet.has(String(id))));
  }, [visibleRowIds]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const mainTotalCols = 3 + dynamicMonths.length + 1;
  const previewTotalCols = 2 + dynamicMonths.length + 1;

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

  const otherRootNow = getOtherRoot(allRows);
  const otherChildrenNow = (otherRootNow?.children || []).map((ch) => String(ch?.title || '').trim()).filter(Boolean);
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

        {/* کپسول/انتخاب پروژه‌ها */}
        <div className="rounded-2xl border border-black/10 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur px-3 py-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs text-black/60 dark:text-neutral-400">پروژه‌ها را انتخاب کنید تا وارد جدول شوند:</div>
            <div className="text-xs text-black/50 dark:text-neutral-500">
              انتخاب‌شده: <span className="font-semibold">{toFaDigits(selectedProjectTargets.length)}</span>
            </div>
          </div>

          {/* انتخاب پروژه + دکمه افزودن */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-stretch">
            <div className="relative min-w-0">
              <select
                dir="rtl"
                value={pickedProjectId}
                onChange={(e) => setPickedProjectId(e.target.value)}
                className="w-full h-11 rounded-2xl border border-black/15 bg-white text-black pr-3 pl-9 sm:pr-4 sm:pl-10 text-sm text-right outline-none appearance-none
                  [-webkit-appearance:none] [-moz-appearance:none] [background-image:none]
                  focus:ring-2 focus:ring-black/10 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                title="انتخاب پروژه"
              >
                <option value="">پروژه را انتخاب کنید...</option>
                <option value="__ALL__">انتخاب همه موارد</option>

                {projectsForPicker.map((p) => {
                  const pid = String(p?.id ?? '');
                  if (!pid) return null;
                  return (
                    <option key={pid} value={pid}>
                      {projectOptionLabel(p)}
                    </option>
                  );
                })}
              </select>
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-black/60 dark:text-neutral-300">
                <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true">
                  <path d="M5.5 7.5 10 12l4.5-4.5" />
                </svg>
              </span>
            </div>
            <button
              type="button"
              onClick={addPickedProject}
              disabled={!pickedProjectId}
              className="h-11 w-full sm:w-12 rounded-2xl bg-black text-white grid place-items-center transition disabled:opacity-40 disabled:cursor-not-allowed
                dark:bg-neutral-100 dark:text-neutral-900"
              aria-label="افزودن پروژه"
              title={!pickedProjectId ? 'ابتدا پروژه را انتخاب کنید' : 'افزودن به کپسول‌ها'}
            >
              <img src="/images/icons/afzodan.svg" alt="" className="w-5 h-5 invert dark:invert-0" />
            </button>
          </div>

          {/* کپسول‌ها */}
          <div className="mt-3 flex flex-wrap gap-2 items-center">
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
                <div
                  key={k}
                  className={`inline-flex items-center gap-1.5 px-2 py-1.5 rounded-full border transition select-none shadow-sm
                    ${active
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-black/15 hover:bg-black/5 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700 dark:hover:bg-white/10'
                    }`}
                  title={active ? 'حذف از جدول اصلی' : 'افزودن به جدول اصلی'}
                >
                  <button
                    type="button"
                    onClick={() => onToggleProjectChip(pid)}
                    className="px-1.5 py-0.5 text-xs md:text-[13px]"
                  >
                    {label}
                  </button>

                  {/* حذف کوچک کنار کپسول (فقط حذف از کپسول، نه حذف دیتا) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeProjectChip(pid);
                    }}
                    className="h-6 w-6 grid place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                    aria-label="حذف کپسول پروژه"
                    title="حذف کپسول پروژه"
                  >
                    <img
                      src="/images/icons/bastan.svg"
                      alt=""
                      className={`w-3 h-3 ${active ? 'invert dark:invert' : 'invert-0 dark:invert'}`}
                    />
                  </button>
                </div>
              );
            })}

            {/* کنترل سایر (بدون متن) */}
            <div className="inline-flex items-center gap-1.5">
              <button
                type="button"
                onClick={openOtherManager}
                className="h-10 w-10 grid place-items-center rounded-xl bg-white text-black ring-1 ring-black/15 hover:bg-black/5
                  dark:bg-neutral-900 dark:text-neutral-100 dark:ring-neutral-800 dark:hover:bg-white/10"
                aria-label="افزودن مورد جدید"
                title="افزودن مورد جدید"
              >
                <img src="/images/icons/afzodan.svg" alt="" className="w-5 h-5 invert-0 dark:invert" />
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-black/10 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3">
            <div className="grid grid-cols-1 md:grid-cols-[minmax(220px,320px)_1fr_auto] gap-2 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-black/60 dark:text-neutral-400">انتخاب مقصد</label>
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
        </div>

        {/* جدول اصلی */}
        <div className="mt-4">
          <TableWrap>
            <div className={tablePreset.outer}>
              <div className={tablePreset.innerPad}>
                <div className={tablePreset.frame + ' shadow-sm'}>
                  <div className="overflow-x-auto overscroll-x-contain">
                    <table
                      className={tablePreset.table + ' table-fixed text-[11px] md:text-[12px] leading-tight min-w-[900px] lg:min-w-[1040px]'}
                      dir="rtl"
                    >
                      <THead>
                        <tr className={tablePreset.headRow + ' sticky top-0 z-10'}>
                          <TH className={`w-12 ${tablePreset.th}`}>
                            <input
                              type="checkbox"
                              className={hoverSelectableRowPreset.checkbox}
                              checked={allVisibleRowsSelected}
                              ref={(el) => {
                                if (el) el.indeterminate = someVisibleRowsSelected;
                              }}
                              onChange={toggleSelectAllVisibleRows}
                              aria-label="انتخاب همه"
                              title="انتخاب همه"
                            />
                          </TH>
                          <TH className={`w-14 ${tablePreset.th}`}>#</TH>
                          <TH className={`w-56 ${tablePreset.th}`}>پروژه / مورد</TH>
                      {dynamicMonths.map((m) => (
                        <TH key={m.key} className={`w-24 px-0 ${tablePreset.th}`}>
                          {m.label}
                        </TH>
                      ))}
                      <TH className={`w-28 border-l border-r border-black/10 dark:border-neutral-700 ${tablePreset.th}`}>
                        جمع
                      </TH>
                        </tr>
                      </THead>

                      <tbody className={tablePreset.body}>
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

                    {displayRows.map((x, idx) => {
                      const r = x.node;
                      const level = x.depth || 0;
                      const rowTotal = sumNodeMonths(r);
                      const isComputed = hasChildren(r);
                      const idxText = indexLabel(x.indexPath);
                      const rowId = String(r.id);
                      const isSelected = selectedRowSet.has(rowId);
                      const shouldDeleteSelectedOnAction = isSelected && selectedRowIds.length > 1;

                      const displayTitle =
                        r.isOther
                          ? (r.title || '—')
                          : (x.depth === 0 && r?.projectId != null
                              ? getProjectLabelById(r.projectId, r.title || '—')
                              : (r.title || '—'));

                      return (
                        <TR
                          key={r.id}
                          className={getHoverSelectableRowClass(isSelected)}
                        >
                          <TD className="px-2 py-2">
                            <input
                              type="checkbox"
                              className={hoverSelectableRowPreset.checkbox}
                              checked={isSelected}
                              onChange={() => toggleRowSelect(rowId)}
                              aria-label="انتخاب ردیف"
                              title="انتخاب ردیف"
                            />
                          </TD>
                          <TD className="px-2 py-2">{toFaDigits(idxText || (idx + 1))}</TD>

                          <TD className="relative pl-16 px-2 py-2 text-right whitespace-nowrap" style={{ paddingRight: 8 + level * 14 }}>
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isComputed) toggleExpand(r.id);
                                  else openEditRowModal(r);
                                }}
                                className={`px-1 py-0.5 text-[12px] ${isComputed ? 'font-semibold hover:underline' : 'hover:underline'}`}
                                title={isComputed ? 'باز/بسته کردن زیرمجموعه‌ها' : 'افزودن/ویرایش توضیحات'}
                              >
                                {displayTitle}
                              </button>

                              {isComputed && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(r.id)}
                                  className="h-5 w-5 grid place-items-center rounded-md border border-black/25 bg-white text-black dark:border-neutral-500 dark:bg-white dark:text-black"
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
                        <TD colSpan={mainTotalCols} className={tablePreset.emptyRow}>
                          از کپسول‌های بالا استفاده کنید تا موارد به جدول اصلی اضافه/کم شوند.
                        </TD>
                      </TR>
                    )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </TableWrap>
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

