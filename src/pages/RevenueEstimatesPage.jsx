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
  const [accessMy, setAccessMy] = useState(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessErr, setAccessErr] = useState('');

  const fetchAccess = useCallback(async () => {
    setAccessErr('');
    setAccessLoading(true);
    try {
      const r = await api('/access/my');
      setAccessMy(r || null);
    } catch (e) {
      setAccessMy(null);
      setAccessErr(e?.message || 'خطا در بررسی دسترسی');
    } finally {
      setAccessLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await fetchAccess();
    })();
    return () => {
      alive = false;
    };
  }, [fetchAccess]);

  const isAllAccess = useMemo(() => {
    const u = accessMy?.user;
    if (!u) return false;

    if (String(u.role || '').toLowerCase() === 'admin') return true;

    const raw = u.access_labels ?? u.access;
    const labels = Array.isArray(raw)
      ? raw.map((x) => String(x))
      : typeof raw === 'string'
      ? [raw]
      : [];

    return labels.includes('all');
  }, [accessMy]);

  const canAccessPage = useMemo(() => {
    if (!accessMy) return null;
    if (isAllAccess) return true;

    const pageRule = accessMy?.pages?.[PAGE_KEY];
    return pageRule?.permitted === 1 || pageRule?.permitted === true;
  }, [accessMy, isAllAccess]);

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

  const [rows, setRows] = useState([]);
  const rowIdRef = useRef(1);

  const makeNode = (p) => ({
    id: p.id,
    title: p.title || '',
    desc: p.desc || '',
    projectId: p.projectId || null,
    months: p.months || {},
    children: p.children || [],
    expanded: !!p.expanded,
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

  const totalsByMonth = useMemo(() => {
    const totals = {};
    dynamicMonths.forEach((m) => (totals[m.key] = 0));
    rows.forEach((r) => {
      dynamicMonths.forEach((m) => {
        totals[m.key] += sumNodeMonth(r, m.key);
      });
    });
    return totals;
  }, [rows, dynamicMonths, sumNodeMonth]);

  const totalGrand = useMemo(
    () => rows.reduce((acc, r) => acc + sumNodeMonths(r), 0),
    [rows, sumNodeMonths]
  );

  const [projects, setProjects] = useState([]);
  const [addProjectMode, setAddProjectMode] = useState('');
  const [addSelectedProjectId, setAddSelectedProjectId] = useState('');

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

  const SEP = ' › ';

  const buildTreeFromItems = useCallback(
    (items) => {
      const rootMap = new Map();

      const getOrCreateChild = (parent, seg) => {
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
          });
          parent.children = [...arr, found];
        }
        return found;
      };

      const ensureRoot = (seg0, projectId) => {
        const key = String(projectId || 'null') + '::' + seg0;
        if (!rootMap.has(key)) {
          rootMap.set(
            key,
            makeNode({
              id: rowIdRef.current++,
              title: seg0,
              desc: '',
              projectId: projectId || null,
              months: {},
              children: [],
              expanded: false,
            })
          );
        }
        return rootMap.get(key);
      };

      items.forEach((it) => {
        const rawTitle = String(it.title || it.code || '').trim();
        if (!rawTitle) return;
        const parts = rawTitle.split(SEP).map((x) => x.trim()).filter(Boolean);
        if (!parts.length) return;

        const projectId = it.project_id || null;

        const monthsMap = {};
        (it.months || []).forEach((m) => {
          if (m && m.key) monthsMap[m.key] = Number(m.amount || 0);
        });

        const root = ensureRoot(parts[0], projectId);

        let node = root;
        for (let i = 1; i < parts.length; i++) {
          node = getOrCreateChild(node, parts[i]);
        }

        node.desc = String(it.description || '');
        node.projectId = projectId || node.projectId || null;
        node.months = monthsMap;
      });

      return Array.from(rootMap.values());
    },
    []
  );

  useEffect(() => {
    if (canAccessPage !== true) return;
    (async () => {
      try {
        const data = await api('/revenue-estimates');
        const items = data.items || [];
        if (!items.length) return;

        items.sort((a, b) => (a.row_index || 0) - (b.row_index || 0));

        rowIdRef.current = 1;
        const tree = buildTreeFromItems(items);
        setRows(tree);
      } catch (e) {
        console.error('load revenue estimates failed', e);
      }
    })();
  }, [buildTreeFromItems, canAccessPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const [addModal, setAddModal] = useState({ open: false, title: '', desc: '' });

  const openAddModal = () => {
    setAddModal({ open: true, title: '', desc: '' });
    setAddProjectMode('');
    setAddSelectedProjectId('');
  };

  const closeAddModal = () => setAddModal((prev) => ({ ...prev, open: false }));

  const handleProjectSelectChange = (e) => {
    const val = e.target.value;
    if (!val) {
      setAddProjectMode('');
      setAddSelectedProjectId('');
      setAddModal((prev) => ({ ...prev, title: '' }));
    } else if (val === 'other') {
      setAddProjectMode('other');
      setAddSelectedProjectId('other');
      setAddModal((prev) => ({ ...prev, title: '' }));
    } else {
      setAddProjectMode('select');
      setAddSelectedProjectId(val);
      const pr = projects.find((p) => String(p.id) === String(val));
      const name = pr?.name || pr?.title || pr?.project_name || pr?.project || '';
      setAddModal((prev) => ({ ...prev, title: name }));
    }
  };

  const handleAddSave = () => {
    const title = addModal.title.trim();
    const desc = addModal.desc.trim();
    if (!title) {
      closeAddModal();
      return;
    }

    const id = rowIdRef.current++;
    const newRoot = makeNode({
      id,
      title,
      desc,
      projectId: addProjectMode === 'select' && addSelectedProjectId ? Number(addSelectedProjectId) : null,
      months: {},
      children: [],
      expanded: false,
    });

    setRows((prev) => [...prev, newRoot]);
    setAddModal({ open: false, title: '', desc: '' });
    setAddProjectMode('');
    setAddSelectedProjectId('');
  };

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
    const pProjectId = findProjectId(rows, childModal.parentId);

    newChild.projectId = pProjectId;

    setRows((prev) => addChildToTree(prev, childModal.parentId, newChild));
    setChildModal({ open: false, parentId: null, title: '', desc: '' });
  };

  const toggleExpand = useCallback((id) => {
    const rec = (nodes) =>
      nodes.map((n) => {
        if (n.id === id) return { ...n, expanded: !n.expanded };
        if (n.children?.length) return { ...n, children: rec(n.children) };
        return n;
      });
    setRows((prev) => rec(prev));
  }, []);

  const removeNode = useCallback((id) => {
    const rec = (nodes) =>
      nodes
        .filter((n) => n.id !== id)
        .map((n) => (n.children?.length ? { ...n, children: rec(n.children) } : n));
    setRows((prev) => rec(prev));
  }, []);

  const [viewRowModal, setViewRowModal] = useState({ open: false, row: null });

  const openViewRowModal = (row) => setViewRowModal({ open: true, row });
  const closeViewRowModal = () => setViewRowModal({ open: false, row: null });

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

    setRows((prev) => updateNodeMonths(prev, monthModal.rowId, monthModal.monthKey, num));

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

    rows.forEach((r, i) => walk(r, 0, [i + 1]));
    return out;
  }, [rows]);

  const indexLabel = (pathArr) => {
    if (!pathArr?.length) return '';
    const cleaned = pathArr.filter((x) => x !== 0);
    return cleaned.join('.');
  };

  const handleSave = async () => {
    if (!rows.length) return;

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
        months,
        amount: total,
      });

      (node.children || []).forEach((ch) => walk(ch, titlePath));
    };

    rows.forEach((r) => walk(r, ''));

    try {
      const payloadRows = flatten.map((r, idx) => ({
        code: 'R' + (idx + 1),
        row_index: idx + 1,
        title: r.title,
        description: r.description,
        project_id: r.project_id,
        months: r.months,
        amount: r.amount,
      }));

      await api('/revenue-estimates', {
        method: 'POST',
        body: JSON.stringify({ rows: payloadRows }),
      });

      const data = await api('/revenue-estimates');
      const items = data.items || [];
      items.sort((a, b) => (a.row_index || 0) - (b.row_index || 0));
      rowIdRef.current = 1;
      const tree = buildTreeFromItems(items);
      setRows(tree);

      alert('برآورد درآمد با موفقیت ذخیره شد.');
    } catch (e) {
      console.error('save revenue estimates failed', e);
      alert('ذخیره برآورد با خطا مواجه شد.');
    }
  };

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
        const monthsHtml = dynamicMonths
          .map((m) => {
            const val = sumNodeMonth(r, m.key);
            return `<td>${val ? buildCell(toFaDigits(formatMoney(val))) : '—'}</td>`;
          })
          .join('');
        return `
          <tr>
            <td>${buildCell(toFaDigits(indexLabel(x.indexPath) || (i + 1)))}</td>
            <td>${buildCell(r.title || '—')}</td>
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

  if (accessErr) {
    return (
      <Card>
        <div className="mb-4 text-black/70 dark:text-neutral-300 text-base md:text-lg">
          <span>بودجه‌بندی</span>
          <span className="mx-2">›</span>
          <span className="font-semibold text-black dark:text-neutral-100">برآورد درآمد ها</span>
        </div>
        <div className="text-sm text-red-600 dark:text-red-400">{accessErr}</div>
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

  return (
    <>
      <Card>
        <div className="mb-4 text-black/70 dark:text-neutral-300 text-base md:text-lg">
          <span>بودجه‌بندی</span>
          <span className="mx-2">›</span>
          <span className="font-semibold text-black dark:text-neutral-100">برآورد درآمد ها</span>
        </div>

        <TableWrap>
          <div className="bg-white rounded-2xl overflow-hidden border border-black/10 shadow-sm text-black dark:bg-neutral-900 dark:text-neutral-200 dark:border-neutral-800">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-[12px] md:text-[13px] text-center [&_th]:text-center [&_td]:text-center" dir="rtl">
                <THead>
                  <tr className="bg-black/5 border-b border-black/10 sticky top-0 z-10 text-black dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-700">
                    <TH className="!text-center py-3 w-14 !text-black dark:!text-neutral-300">#</TH>
                    <TH className="!text-center py-3 w-56 !text-black dark:!text-neutral-300">پروژه / مورد</TH>
                    {dynamicMonths.map((m) => (
                      <TH key={m.key} className="!text-center py-3 w-24 px-0 !text-black dark:!text-neutral-300">
                        {m.label}
                      </TH>
                    ))}
                    <TH className="!text-center py-3 w-28 !text-black dark:!text-neutral-300 border-l border-r border-black/10 dark:border-neutral-700">
                      جمع
                    </TH>
                  </tr>
                </THead>

                <tbody className="[&_td]:text-black dark:[&_td]:text-neutral-100">
                  {rows.length > 0 && (
                    <TR className="text-center border-t border-black/10 bg-black/[0.04] font-semibold dark:border-neutral-800 dark:bg-white/10">
                      <TD className="px-2 py-3 border-b border-black/10 dark:border-neutral-800">-</TD>
                      <TD className="px-2 py-3 text-center border-b border-black/10 dark:border-neutral-800">جمع</TD>
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
                      <TD className="px-3 py-3 whitespace-nowrap text-center border-l border-r border-b border-black/10 dark:border-neutral-700">
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
                        <TR key={'addchild-' + x.parentId} className="border-t border-black/10 bg-black/[0.015] dark:border-neutral-800 dark:bg-white/5">
                          <TD className="px-2 py-3 text-center text-black/60 dark:text-neutral-400">—</TD>
                          <TD className="px-2 py-3 text-center">
                            <div className="flex items-center justify-center" style={{ paddingInlineStart: Math.min(44, x.depth * 18) }}>
                              <button
                                type="button"
                                onClick={() => openChildModal(x.parentId)}
                                className="h-10 w-10 mx-auto grid place-items-center rounded-xl border border-black/30 bg-white hover:bg-black/5 dark:border-neutral-500 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                                aria-label="افزودن زیرمجموعه"
                                title="افزودن زیرمجموعه"
                              >
                                <img src="/images/icons/afzodan.svg" alt="" className="w-5 h-5 dark:invert" />
                              </button>
                            </div>
                          </TD>
                          {dynamicMonths.map((m) => (
                            <TD key={m.key} className="px-0 py-2 text-center text-black/40 dark:text-neutral-500">—</TD>
                          ))}
                          <TD className="px-3 py-3 text-center text-black/40 dark:text-neutral-500">—</TD>
                        </TR>
                      );
                    }

                    const r = x.node;
                    const rowTotal = sumNodeMonths(r);
                    const isComputed = hasChildren(r);
                    const depthPad = Math.min(44, x.depth * 18);
                    const idxText = indexLabel(x.indexPath);

                    return (
                      <TR
                        key={r.id}
                        className="text-center border-t border-black/10 odd:bg-black/[0.02] even:bg-black/[0.04] hover:bg-black/[0.06] transition-colors dark:border-neutral-800 dark:odd:bg-white/5 dark:even:bg-white/10 dark:hover:bg-white/15"
                      >
                        <TD className="px-2 py-3">{toFaDigits(idxText || (idx + 1))}</TD>

                        <TD className="px-2 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <div className="flex items-center justify-center gap-2" style={{ paddingInlineStart: depthPad }}>
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() => openViewRowModal(r)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') openViewRowModal(r);
                                }}
                                className="inline-flex flex-row-reverse items-center gap-2 px-3 py-2 rounded-2xl border border-black/10 bg-white/90 shadow-sm ring-1 ring-black/5 text-[11px] text-black cursor-pointer select-none hover:bg-black/[0.03] hover:shadow transition dark:border-neutral-700 dark:bg-neutral-900/70 dark:ring-0 dark:text-neutral-100 dark:hover:bg-white/10"
                                title="مشاهده جزئیات"
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleExpand(r.id);
                                  }}
                                  className="h-6 w-6 grid place-items-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
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

                                <span className="max-w-[220px] truncate">{r.title || '—'}</span>
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-black/50 dark:bg-white/70" />
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeNode(r.id)}
                              className="inline-flex items-center justify-center p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10"
                              aria-label="حذف"
                              title="حذف"
                            >
                              <img src="/images/icons/bastan.svg" alt="" className="w-4 h-4 dark:invert" />
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
                                className={`w-24 mx-auto h-12 md:w-24 md:h-12 rounded-2xl border text-[11px] md:text-[12px] flex items-center justify-center shadow-sm transition ${
                                  hasVal
                                    ? 'bg-[#edaf7c] border-[#edaf7c]/90 text-black'
                                    : 'bg-black/5 border-black/10 text-black/70 dark:bg-white/5 dark:border-neutral-700 dark:text-neutral-100'
                                } ${isComputed ? 'opacity-70 cursor-default' : 'cursor-pointer'}`}
                                title={isComputed ? 'این مقدار از زیرمجموعه‌ها محاسبه می‌شود' : 'ثبت/ویرایش مقدار'}
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

                        <TD className="px-3 py-3 whitespace-nowrap text-center border-l border-r border-black/10 dark:border-neutral-700">
                          <span className="inline-flex items-center justify-center gap-1">
                            <span className="ltr">{toFaDigits(formatMoney(rowTotal || 0))}</span>
                            <span>ریال</span>
                          </span>
                        </TD>
                      </TR>
                    );
                  })}

                  <TR className="border-t border-black/10 bg-black/[0.015] dark:border-neutral-800 dark:bg-white/5">
                    <TD className="px-2 py-3 text-center text-black/60 dark:text-neutral-400">
                      {rows.length ? '—' : toFaDigits(1)}
                    </TD>
                    <TD className="px-2 py-3 text-center">
                      <button
                        type="button"
                        onClick={openAddModal}
                        className="h-10 w-10 mx-auto grid place-items-center rounded-xl border border-black/30 bg-white hover:bg-black/5 dark:border-neutral-500 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                        aria-label="افزودن ردیف"
                        title="افزودن ردیف جدید"
                      >
                        <img src="/images/icons/afzodan.svg" alt="" className="w-5 h-5 dark:invert" />
                      </button>
                    </TD>
                    {dynamicMonths.map((m) => (
                      <TD key={m.key} className="px-0 py-2 text-center text-black/40 dark:text-neutral-500">—</TD>
                    ))}
                    <TD className="px-3 py-3 text-center text-black/40 dark:text-neutral-500">—</TD>
                  </TR>
                </tbody>
              </table>
            </div>
          </div>
        </TableWrap>

        <div className="mt-4 flex items-center gap-2 justify-end">
          <button
            onClick={handleSave}
            className="h-10 w-10 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 grid place-items-center disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="ذخیره برآورد"
            title="ذخیره برآورد"
            disabled={!rows.length}
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

        {addModal.open && (
          <div className="fixed inset-0 z-40 grid place-items-center px-3">
            <div className="absolute inset-0 bg-black/25 dark:bg-neutral-950/55 backdrop-blur-[2px]" onClick={closeAddModal} />
            <div
              className="relative w-full max-w-sm rounded-2xl bg-white text-neutral-900 border border-black/10 shadow-2xl dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 p-4 space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">افزودن ردیف جدید</div>
                  <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">یک پروژه / مورد جدید برای برآورد درآمد اضافه کنید.</div>
                </div>
                <button type="button" onClick={closeAddModal} className="h-8 w-8 grid place-items-center rounded-xl bg-black text-white dark:bg-neutral-100 dark:text-neutral-900">
                  <img src="/images/icons/bastan.svg" alt="" className="w-4 h-4 invert dark:invert-0" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-xs text-neutral-600 dark:text-neutral-300">عنوان پروژه / مورد</label>

                  <select
                    className="mt-1 w-full rounded-xl px-3 py-2 text-sm bg-white text-neutral-900 border border-black/15 outline-none dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                    value={addProjectMode === 'other' ? 'other' : addProjectMode === 'select' ? addSelectedProjectId : ''}
                    onChange={handleProjectSelectChange}
                  >
                    <option value="">انتخاب پروژه...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name || p.title || p.project_name || p.project || 'پروژه بدون نام'}
                      </option>
                    ))}
                    <option value="other">سایر</option>
                  </select>

                  {addProjectMode === 'other' && (
                    <input
                      type="text"
                      className="mt-2 w-full rounded-xl px-3 py-2 text-sm bg-white text-black placeholder-black/40 border border-black/15 outline-none focus:ring-2 focus:ring-black/10 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                      value={addModal.title}
                      onChange={(e) => setAddModal((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="مثلاً فروش خدمات، اجاره تجهیزات و ..."
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-neutral-600 dark:text-neutral-300">توضیحات (اختیاری)</label>
                  <textarea
                    className="w-full min-h-[72px] rounded-xl px-3 py-2 text-sm bg-white text-black placeholder-black/40 border border-black/15 outline-none focus:ring-2 focus:ring-black/10 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                    value={addModal.desc}
                    onChange={(e) => setAddModal((prev) => ({ ...prev, desc: e.target.value }))}
                    placeholder="در صورت نیاز توضیحات تکمیلی را بنویسید."
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button type="button" onClick={closeAddModal} className="h-9 px-4 rounded-xl border border-neutral-300 text-xs text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800">
                  انصراف
                </button>

                <button
                  type="button"
                  onClick={handleAddSave}
                  className="h-9 w-11 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 grid place-items-center disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={!addModal.title.trim()}
                  aria-label="افزودن"
                  title="افزودن"
                >
                  <img src="/images/icons/afzodan.svg" alt="" className="w-5 h-5 invert dark:invert-0" />
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

        {viewRowModal.open && (
          <div className="fixed inset-0 z-40 grid place-items-center px-3">
            <div className="absolute inset-0 bg-black/25 dark:bg-neutral-950/55 backdrop-blur-[2px]" onClick={closeViewRowModal} />
            <div
              className="relative w-full max-w-sm rounded-2xl bg-white text-neutral-900 border border-black/10 shadow-2xl dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 p-4 space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">جزئیات ردیف</div>
                  <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">عنوان و توضیحات ثبت‌شده را مشاهده می‌کنید.</div>
                </div>
                <button type="button" onClick={closeViewRowModal} className="h-8 w-8 grid place-items-center rounded-xl bg-black text-white dark:bg-neutral-100 dark:text-neutral-900">
                  <img src="/images/icons/bastan.svg" alt="" className="w-4 h-4 invert dark:invert-0" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-xs text-neutral-600 dark:text-neutral-300">عنوان</label>
                  <div className="mt-1 w-full rounded-xl px-3 py-2 text-sm bg-black/[0.02] text-black border border-black/10 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700">
                    {viewRowModal.row?.title || '—'}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-neutral-600 dark:text-neutral-300">توضیحات</label>
                  <div className="w-full min-h-[72px] rounded-xl px-3 py-2 text-sm bg-black/[0.02] text-black border border-black/10 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 whitespace-pre-wrap">
                    {viewRowModal.row?.desc?.trim() ? viewRowModal.row.desc : 'بدون توضیحات'}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button type="button" onClick={closeViewRowModal} className="h-9 px-5 rounded-xl border border-neutral-300 text-xs text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800">
                  بستن
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
                      {rows.length === 0 ? (
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
