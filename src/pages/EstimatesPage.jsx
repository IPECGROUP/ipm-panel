// src/pages/EstimatesPage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Shell from "../components/layout/Shell.jsx";
import Card from "../components/ui/Card.jsx";
import { TableWrap, THead, TH, TR, TD } from "../components/ui/Table.jsx";

const PAGE_KEY = "EstimatesPage";

export default function EstimatesPage() {
  const [active, setActive] = useState('office'); // office|site|finance|cash|capex|projects
  const allTabs = [
    { id: 'office', label: 'دفتر', prefix: 'OB' },
    { id: 'site', label: 'سایت', prefix: 'SB' },
    { id: 'finance', label: 'مالی', prefix: 'FB' },
    { id: 'cash', label: 'نقدی', prefix: 'CB' },
    { id: 'capex', label: 'سرمایه‌ای', prefix: 'IB' },
    { id: 'projects', label: 'پروژه‌ها', prefix: '' },
  ];

  async function api(path, opt = {}) {
    const res = await fetch('/api' + path, {
      credentials: 'include',
      ...opt,
      headers: { 'Content-Type': 'application/json', ...(opt.headers || {}) },
    });
    const txt = await res.text();
    let data = {};
    try {
      data = txt ? JSON.parse(txt) : {};
    } catch (_e) {}
    if (!res.ok) throw new Error(data?.error || data?.message || 'request_failed');
    return data;
  }

  const [me, setMe] = useState(null);
  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const r = await api('/auth/me');
        if (!stop) setMe(r.user || null);
      } catch (_) {
        if (!stop) setMe(null);
      }
    })();
    return () => {
      stop = true;
    };
  }, []);

  const isAdmin = !!(
    me &&
    (me.is_main_admin ||
      me.is_admin ||
      me.role === 'admin' ||
      (Array.isArray(me?.roles) && me.roles.includes('admin')))
  );

  const tabs = useMemo(() => allTabs, []);
  const prefixOf = (kind) => allTabs.find((t) => t.id === kind)?.prefix || '';

  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const r = await api('/projects');
        if (!stop) setProjects(r.projects || r.items || []);
      } catch (_) {
        if (!stop) setProjects([]);
      }
    })();
    return () => {
      stop = true;
    };
  }, []);

  const selectedProject = useMemo(
    () => (projects || []).find((p) => String(p.id) === String(projectId)),
    [projects, projectId],
  );

  const sortedProjects = useMemo(
    () =>
      (projects || [])
        .slice()
        .sort((a, b) =>
          String(a?.code || '').localeCompare(String(b?.code || ''), 'fa', {
            numeric: true,
            sensitivity: 'base',
          }),
        ),
    [projects],
  );

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [histLoading, setHistLoading] = useState(false);
  const [historyMap, setHistoryMap] = useState({});

  const formatMoney = (n) => {
    const s = String(n ?? '');
    if (s === '') return '';
    const sign = Number(n) < 0 ? '-' : '';
    const digits = String(Math.abs(Number(n) || 0));
    return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  const toFaDigits = (s) => String(s ?? '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
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

  const renderCode = (code) => {
    if (active === 'projects') return code || '—';
    const pre = (prefixOf(active) || '').toUpperCase();
    const raw = String(code || '').trim();
    const re = new RegExp('^' + pre + '[\\-\\.]?\\s*', 'i');
    const suffix = raw.replace(re, '');
    return pre + '-' + suffix;
  };

  const coreOf = (s) => {
    const raw = String(s || '').trim();
    const noPrefix = raw.replace(/^[A-Za-z]+[^0-9]*/, '');
    const normalized = noPrefix.replace(/[^\d.]+/g, '.');
    const cleaned = normalized.replace(/\.+/g, '.').replace(/^\./, '').replace(/\.$/, '');
    return cleaned;
  };

  const monthNames = [
    'فروردین',
    'اردیبهشت',
    'خرداد',
    'تیر',
    'مرداد',
    'شهریور',
    'مهر',
    'آبان',
    'آذر',
    'دی',
    'بهمن',
    'اسفند',
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
  }, []);

  const dynamicMonths = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 6; i++) {
      const m = ((jalaliMonthIndex + i - 1) % 12) + 1;
      arr.push({ key: 'm' + m, monthIndex: m, label: monthNames[m - 1] });
    }
    return arr;
  }, [jalaliMonthIndex]);

  const sumMonths = (r) =>
    dynamicMonths.reduce((acc, m) => {
      const lastVal = Number((r.lastMonths && r.lastMonths[m.key]) || 0);
      const curRaw = r.months && r.months[m.key];
      if (curRaw === undefined || curRaw === null) return acc;
      const curVal = Number(curRaw) || 0;
      return acc + (curVal - lastVal);
    }, 0);

  useEffect(() => {
    let abort = false;
    (async () => {
      setErr('');
      if (active === 'projects' && !projectId) {
        setRows([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        let items = [];

        if (active === 'projects') {
          const qs = new URLSearchParams();
          qs.set('kind', 'projects');
          qs.set('project_id', String(projectId));
          const r = await api('/budget-estimates?' + qs.toString());
          items = r.items || [];

          try {
            const centers = await api('/centers/projects');
            const base = String(selectedProject?.code || '').trim();
            const extra = (centers?.items || [])
              .filter((c) => {
                const suf = String(c?.suffix || '').trim();
                return suf === base || suf.startsWith(base + '.');
              })
              .map((c) => ({
                code: c.suffix,
                center_desc: c.description || '',
                last_desc: '',
                last_amount: 0,
              }));

            const byCode = new Map(items.map((it) => [String(it.code), it]));
            for (const e of extra) if (!byCode.has(String(e.code))) byCode.set(String(e.code), e);
            items = Array.from(byCode.values());
          } catch (_e) {}

          try {
            const qh = new URLSearchParams();
            qh.set('kind', 'projects');
            qh.set('project_id', String(projectId));
            const hist = await api('/budget-estimates/history?' + qh.toString());
            const hmap = hist?.history || {};
            const lastMap = {};
            Object.keys(hmap).forEach((code) => {
              const arr = (hmap[code] || [])
                .slice()
                .sort((a, b) =>
                  String(b.created_at || '').localeCompare(String(a.created_at || '')),
                );
              if (arr[0]) lastMap[code] = Number(arr[0].amount || 0);
            });
            items = items.map((it) => ({
              ...it,
              last_amount:
                (lastMap[it.code] !== undefined ? lastMap[it.code] : it.last_amount) || 0,
            }));
          } catch (_e) {}
        } else {
          const qs = new URLSearchParams();
          qs.set('kind', active);
          const r = await api('/budget-estimates?' + qs.toString());
          items = r.items || [];
        }

        if (abort) return;

        const mapped = (items || []).map((it) => {
          let desc = it.last_desc ?? '';
          let lastMonths = {};
          if (desc && typeof desc === 'string') {
            try {
              const parsed = JSON.parse(desc);
              if (parsed && typeof parsed === 'object') {
                if (typeof parsed.desc === 'string') desc = parsed.desc;
                if (parsed.months && typeof parsed.months === 'object') {
                  const mm = {};
                  dynamicMonths.forEach((m) => {
                    const v = parsed.months[m.key];
                    if (v !== undefined && v !== null && !isNaN(Number(v))) mm[m.key] = Number(v);
                  });
                  lastMonths = mm;
                }
              }
            } catch {}
          }
          return {
            code: it.code,
            name: it.center_desc ?? '',
            desc: desc || '',
            baseAmount: it.last_amount ?? 0,
            amountRaw: 0,
            amountStr: '',
            months: {},
            lastMonths,
          };
        });

        const sorted = mapped.slice().sort((a, b) =>
          String(renderCode(a.code)).localeCompare(String(renderCode(b.code)), 'fa', {
            numeric: true,
            sensitivity: 'base',
          }),
        );
        setRows(sorted);
      } catch (ex) {
        if (!abort) setErr(ex.message || 'خطا در بارگذاری');
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, [active, projectId, selectedProject?.code, dynamicMonths]);

  const filteredRows = useMemo(() => {
    if (active !== 'projects') return rows || [];
    const preCore = coreOf(selectedProject?.code);
    if (!preCore) return [];
    return (rows || []).filter((r) => {
      const cCore = coreOf(r.code);
      return cCore === preCore || cCore.startsWith(preCore + '.');
    });
  }, [rows, active, selectedProject]);

  const finalPreviewOf = (r) =>
    dynamicMonths.reduce((acc, m) => {
      let val = 0;
      if (r.months && r.months[m.key] != null) val = Number(r.months[m.key] || 0);
      else val = Number((r.lastMonths && r.lastMonths[m.key]) || 0);
      return acc + (val || 0);
    }, 0);

  const onUpdate = async () => {
    try {
      setSaving(true);
      setErr('');

      const monthsByCode = new Map();
      const payloadRows = (filteredRows || [])
        .map((r) => {
          if (!r.code) return null;

          const delta = sumMonths(r);

          const nextMonths = {};
          dynamicMonths.forEach((m) => {
            const cur = r.months && r.months[m.key];
            const last = r.lastMonths && r.lastMonths[m.key];
            const effective =
              cur !== undefined && cur !== null ? Number(cur) || 0 : Number(last) || 0;
            if (effective) nextMonths[m.key] = effective;
          });
          monthsByCode.set(r.code, nextMonths);

          const plainDesc = (r.desc || '').trim();
          let description = null;
          if (plainDesc || Object.keys(nextMonths).length) {
            try {
              description = JSON.stringify({ desc: plainDesc || null, months: nextMonths });
            } catch {
              description = plainDesc || null;
            }
          }

          if (!delta && !plainDesc && !Object.keys(nextMonths).length) return null;

          const total = Object.values(nextMonths).reduce((sum, v) => sum + Number(v || 0), 0);

          return { code: r.code, description, amount: total };
        })
        .filter(Boolean);

      if (payloadRows.length === 0) {
        setShowModal(true);
        return;
      }

      const body = {
        kind: active,
        project_id: active === 'projects' ? Number(projectId) : null,
        rows: payloadRows,
      };

      await api('/budget-estimates', { method: 'POST', body: JSON.stringify(body) });

      setRows((prev) =>
        prev.map((r) => {
          const hit = payloadRows.find((pr) => pr.code === r.code);
          if (!hit) return { ...r, amountRaw: 0, amountStr: '0' };
          const nextMonths = monthsByCode.get(r.code) || r.lastMonths || {};
          return {
            ...r,
            baseAmount: Number(hit.amount || 0),
            amountRaw: 0,
            amountStr: '0',
            desc: '',
            months: {},
            lastMonths: nextMonths,
          };
        }),
      );

      setShowModal(true);
      await fetchHistory();
    } catch (ex) {
      setErr(ex.message || 'خطا در بروزرسانی');
    } finally {
      setSaving(false);
    }
  };

  const resetEstimate = async (code) => {
    try {
      setErr('');
      const body = {
        kind: active,
        project_id: active === 'projects' ? Number(projectId) : null,
        rows: [{ code, amount: 0, description: null }],
      };
      await api('/budget-estimates', { method: 'POST', body: JSON.stringify(body) });
      setRows((prev) =>
        prev.map((r) =>
          r.code === code
            ? { ...r, baseAmount: 0, amountRaw: 0, amountStr: '0', months: {}, lastMonths: {}, desc: '' }
            : r,
        ),
      );
    } catch (ex) {
      setErr(ex.message || 'خطا در صفر کردن برآورد');
    }
  };

  const rowsToRender = useMemo(() => filteredRows || [], [filteredRows]);

  const resetAllEstimates = async () => {
    if (!isAdmin) return;
    if (!rowsToRender.length) return;
    const ok = window.confirm(
      'آیا از صفر کردن تمام برآوردهای این صفحه اطمینان دارید؟ این کار قابل بازگشت نیست.',
    );
    if (!ok) return;

    try {
      setSaving(true);
      setErr('');

      const rowsToSend = (rowsToRender || [])
        .filter((r) => r.code)
        .map((r) => ({ code: r.code, amount: 0, description: null }));

      if (!rowsToSend.length) return;

      const body = {
        kind: active,
        project_id: active === 'projects' ? Number(projectId) : null,
        rows: rowsToSend,
      };

      await api('/budget-estimates', { method: 'POST', body: JSON.stringify(body) });

      setRows((prev) =>
        prev.map((r) =>
          rowsToSend.find((x) => x.code === r.code)
            ? { ...r, baseAmount: 0, amountRaw: 0, amountStr: '0', months: {}, lastMonths: {}, desc: '' }
            : r,
        ),
      );
    } catch (ex) {
      setErr(ex.message || 'خطا در صفر کردن برآوردها');
    } finally {
      setSaving(false);
    }
  };

  const printModal = () => {
    const el = document.getElementById('estimate-preview');
    if (!el) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html lang="fa" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>برآورد هزینه‌ها</title>
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
    const rowsData = rowsToRender || [];
    const buildCell = (v) =>
      String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const headerHtml = `
      <tr>
        <th>#</th>
        <th>کد بودجه</th>
        <th>نام بودجه</th>
        ${dynamicMonths.map((m) => `<th>${buildCell(m.label)}</th>`).join('')}
        <th>جمع</th>
      </tr>
    `;

    const bodyHtml = rowsData
      .map((r, i) => {
        const total = finalPreviewOf(r);
        return `
        <tr>
          <td>${buildCell(toFaDigits(i + 1))}</td>
          <td>${buildCell(renderCode(r.code))}</td>
          <td>${buildCell(r.name || '—')}</td>
          ${dynamicMonths
            .map((m) => {
              let val = 0;
              if (r.months && r.months[m.key] != null) val = Number(r.months[m.key] || 0);
              else val = Number((r.lastMonths && r.lastMonths[m.key]) || 0);
              return `<td>${buildCell(val ? toFaDigits(formatMoney(val)) : '—')}</td>`;
            })
            .join('')}
          <td>${buildCell(toFaDigits(formatMoney(total || 0)))}</td>
        </tr>
      `;
      })
      .join('');

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
            <tbody>${bodyHtml || `<tr><td colspan="${3 + dynamicMonths.length + 1}">موردی برای نمایش نیست.</td></tr>`}</tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'estimates.xls';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const fetchHistory = useCallback(async () => {
    try {
      setHistLoading(true);
      const qs = new URLSearchParams();
      qs.set('kind', active);
      if (active === 'projects' && projectId) qs.set('project_id', String(projectId));
      const r = await api('/budget-estimates/history?' + qs.toString()).catch(() => ({ history: {} }));
      const h = r?.history || {};
      Object.keys(h).forEach((k) => {
        h[k] = (h[k] || [])
          .slice()
          .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
      });
      setHistoryMap(h);
    } finally {
      setHistLoading(false);
    }
  }, [active, projectId]);

  useEffect(() => {
    if (showModal) fetchHistory();
  }, [showModal, fetchHistory]);

  const hierarchyMaps = useMemo(() => {
    const base = rowsToRender || [];
    const coreByCode = {};
    base.forEach((r) => {
      if (!r || !r.code) return;
      coreByCode[r.code] = coreOf(r.code);
    });
    const hasChildrenByCode = {};
    base.forEach((r) => {
      if (!r || !r.code) return;
      const core = coreByCode[r.code];
      if (!core) {
        hasChildrenByCode[r.code] = false;
        return;
      }
      const prefix = core + '.';
      hasChildrenByCode[r.code] = base.some((other) => {
        if (!other || !other.code || other === r) return false;
        const oc = coreByCode[other.code];
        return oc && oc.startsWith(prefix);
      });
    });
    const isLeafByCode = {};
    Object.keys(coreByCode).forEach((code) => {
      isLeafByCode[code] = !hasChildrenByCode[code];
    });
    return { coreByCode, hasChildrenByCode, isLeafByCode };
  }, [rowsToRender]);

  const [openCodes, setOpenCodes] = useState({});
  const [codeSortDir, setCodeSortDir] = useState('asc');

  useEffect(() => {
    setOpenCodes({});
  }, [active, projectId]);

  const displayRows = useMemo(() => {
    const base = rowsToRender || [];
    if (!base.length) return [];

    const nodes = base.map((r, index) => {
      const core = coreOf(r.code);
      const parts = core ? core.split('.').filter(Boolean) : [];
      const key = core || `__idx_${index}`;
      let parentCore = null;
      if (parts.length > 1) parentCore = parts.slice(0, -1).join('.');
      return { row: r, key, core, parentCore, parts };
    });

    const byCore = new Map();
    nodes.forEach((n) => {
      if (n.core) byCore.set(n.core, n);
    });

    const childrenMap = new Map();
    nodes.forEach((n) => {
      if (!n.parentCore) return;
      if (!byCore.has(n.parentCore)) return;
      if (!childrenMap.has(n.parentCore)) childrenMap.set(n.parentCore, []);
      childrenMap.get(n.parentCore).push(n);
    });

    nodes.forEach((n) => {
      n.hasChildren = !!(n.core && childrenMap.has(n.core));
    });

    const sortFn = (a, b) => {
      const ca = renderCode(a.row.code);
      const cb = renderCode(b.row.code);
      const cmp = String(ca || '').localeCompare(String(cb || ''), 'fa', {
        numeric: true,
        sensitivity: 'base',
      });
      return codeSortDir === 'asc' ? cmp : -cmp;
    };

    const roots = nodes.filter((n) => !n.parentCore || !byCore.has(n.parentCore));
    roots.sort(sortFn);
    for (const list of childrenMap.values()) list.sort(sortFn);

    const result = [];
    const visit = (node, depth) => {
      result.push({ row: node.row, depth, key: node.key, core: node.core, hasChildren: node.hasChildren });
      if (!node.hasChildren) return;
      const toggleKey = node.core || node.key;
      const isOpen = !!openCodes[toggleKey];
      if (!isOpen) return;
      const children = node.core ? childrenMap.get(node.core) || [] : [];
      children.forEach((child) => visit(child, depth + 1));
    };

    roots.forEach((root) => visit(root, 0));
    return result;
  }, [rowsToRender, openCodes, renderCode, codeSortDir]);

  const totalsByMonth = {};
  dynamicMonths.forEach((m) => {
    totalsByMonth[m.key] = 0;
  });
  let totalGrand = 0;
  (rowsToRender || []).forEach((r) => {
    if (!r || !r.code) return;
    if (!hierarchyMaps.isLeafByCode[r.code]) return;
    dynamicMonths.forEach((m) => {
      let val = 0;
      if (r.months && r.months[m.key] != null) val = Number(r.months[m.key] || 0);
      else val = Number((r.lastMonths && r.lastMonths[m.key]) || 0);
      if (val) totalsByMonth[m.key] += val;
    });
    totalGrand += finalPreviewOf(r);
  });

  const TopButtons = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => setActive(t.id)}
          className={`h-10 px-4 rounded-2xl border text-sm shadow-sm transition
            ${
              active === t.id
                ? 'bg-neutral-100 text-neutral-900 border-neutral-100'
                : 'bg-white text-black border border-black/15 hover:bg-black/5 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 dark:hover:bg-white/10'
            }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  const ProjectsControls = () => {
    if (active !== 'projects') return null;
    return (
      <div className="grid grid-cols-1 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-black/70 dark:text-neutral-300">پروژه</label>
          <select
            className="w-full rounded-xl px-3 py-2 text-sm font-[inherit] bg-white text-black placeholder-black/40 border border-black/15 outline-none text-right
                       dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:placeholder-neutral-400"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option className="bg-white dark:bg-neutral-900" value="">
              انتخاب کنید
            </option>
            {(sortedProjects || []).map((p) => (
              <option className="bg-white dark:bg-neutral-900" key={p.id} value={p.id}>
                {p.code ? `${p.code} - ${p.name || ''}` : p.name || '—'}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  const [monthModal, setMonthModal] = useState({
    open: false,
    code: null,
    monthKey: '',
    label: '',
    name: '',
    value: '',
  });
  const monthInputRef = useRef(null);

  const openMonthModal = (row, month) => {
    let rawVal = 0;
    if (row.months && row.months[month.key] != null) rawVal = row.months[month.key];
    else if (row.lastMonths && row.lastMonths[month.key] != null) rawVal = row.lastMonths[month.key];
    const currentVal = Number(rawVal || 0);
    setMonthModal({
      open: true,
      code: row.code,
      monthKey: month.key,
      label: month.label,
      name: row.name || '',
      value: currentVal ? formatMoney(currentVal) : '',
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
    if (!monthModal.code || !monthModal.monthKey) {
      closeMonthModal();
      return;
    }
    const num = parseMoney(monthModal.value);
    setRows((prev) =>
      prev.map((r) => {
        if (r.code !== monthModal.code) return r;
        const oldMonths = r.months || {};
        return { ...r, months: { ...oldMonths, [monthModal.monthKey]: num } };
      }),
    );
    setMonthModal({ open: false, code: null, monthKey: '', label: '', name: '', value: '' });
  };

  useEffect(() => {
    if (monthModal.open && monthInputRef.current) {
      monthInputRef.current.focus();
      monthInputRef.current.select();
    }
  }, [monthModal.open]);

  return (
    <>
      <Card>
        <div className="mb-4 text-black/70 dark:text-neutral-300 text-base md:text-lg">
          <span>بودجه‌بندی</span>
          <span className="mx-2">›</span>
          <span className="font-semibold text-black dark:text-neutral-100">برآورد هزینه‌ها</span>
        </div>

        <div className="space-y-4 mb-4">
          <TopButtons />
          <ProjectsControls />
        </div>

        <TableWrap>
          <div className="bg-white rounded-2xl overflow-hidden border border-black/10 shadow-sm text-black dark:bg-neutral-900 dark:text-neutral-200 dark:border-neutral-800">
            <div className="overflow-x-auto">
              <table
                className="w-full table-fixed text-[12px] md:text-[13px] text-center [&_th]:text-center [&_td]:text-center"
                dir="rtl"
              >
                <THead>
                  <tr className="bg-black/5 border-b border-black/10 sticky top-0 z-10 text-black dark:bg-white/5 dark:text-neutral-200 dark:border-neutral-700">
                    <TH className="!text-center py-3 w-14 !text-black dark:!text-neutral-200">#</TH>
                    <TH className="!text-center py-3 w-40 !text-black dark:!text-neutral-200">
                      <div className="flex items-center justify-center gap-1 w-full">
                        <span>کد بودجه</span>
                        <button
                          type="button"
                          onClick={() => setCodeSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                          className="rounded-lg px-2 py-1 ring-1 ring-black/15 hover:bg-black/5 dark:ring-neutral-800 dark:hover:bg-white/10"
                          aria-label="مرتب‌سازی کد بودجه"
                        >
                          <img
                            src={
                              codeSortDir === 'asc'
                                ? '/images/icons/kochikbebozorg.svg'
                                : '/images/icons/bozorgbekochik.svg'
                            }
                            alt=""
                            className="w-5 h-5 dark:invert"
                          />
                        </button>
                      </div>
                    </TH>
                    <TH className="!text-center py-3 w-40 !text-black dark:!text-neutral-200">نام بودجه</TH>
                    {dynamicMonths.map((m) => (
                      <TH key={m.key} className="!text-center py-3 w-24 px-0 !text-black dark:!text-neutral-200">
                        {m.label}
                      </TH>
                    ))}
                    <TH className="!text-center py-3 w-28 !text-black dark:!text-neutral-200 border-l border-r border-black/10 dark:border-neutral-700">
                      <div className="flex items-center justify-center gap-1">
                        <span>جمع</span>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={resetAllEstimates}
                            className="h-5 w-5 flex items-center justify-center rounded-full border border-black/20 text-xs leading-none hover:bg-black/10 dark:border-neutral-600 dark:hover:bg-white/10"
                            title="صفر کردن همه"
                          >
                            <span className="text-[11px]">×</span>
                          </button>
                        )}
                      </div>
                    </TH>
                  </tr>
                </THead>

                <tbody className="[&_td]:text-black dark:[&_td]:text-neutral-100">
                  {loading ? (
                    <TR>
                      <TD
                        colSpan={3 + dynamicMonths.length + 1}
                        className="text-center text-black/60 dark:text-neutral-400 py-4"
                      >
                        در حال بارگذاری…
                      </TD>
                    </TR>
                  ) : displayRows.length === 0 ? (
                    <TR>
                      <TD
                        colSpan={3 + dynamicMonths.length + 1}
                        className="text-center text-black/60 py-4 dark:text-neutral-400"
                      >
                        {active === 'projects' && !projectId ? 'ابتدا پروژه را انتخاب کنید' : 'موردی یافت نشد.'}
                      </TD>
                    </TR>
                  ) : (
                    <>
                      <TR className="text-center border-t border-black/10 bg-black/[0.04] font-semibold dark:border-neutral-800 dark:bg-white/10">
                        <TD className="px-2 py-3 border-b border-black/10 dark:border-neutral-800">-</TD>
                        <TD className="px-2 py-3 border-b border-black/10 dark:border-neutral-800">-</TD>
                        <TD className="px-2 py-3 text-center border-b border-black/10 dark:border-neutral-800">جمع</TD>
                        {dynamicMonths.map((m) => (
                          <TD
                            key={m.key}
                            className="px-0 py-2 text-center align-middle border-b border-black/10 dark:border-neutral-800"
                          >
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

                      {displayRows.map((node, idx) => {
                        const r = node.row;
                        const code = r.code;
                        const isParent = !!code && !hierarchyMaps.isLeafByCode[r.code];
                        const hasChildren = !!node.hasChildren || isParent;
                        const toggleKey = node.core || node.key;
                        const isOpen = !!openCodes[toggleKey];

                        const finalTotal = (() => {
                          if (!code || !isParent) return finalPreviewOf(r);
                          const core = hierarchyMaps.coreByCode[code];
                          if (!core) return finalPreviewOf(r);
                          const prefix = core + '.';
                          let sum = 0;
                          (rowsToRender || []).forEach((rr) => {
                            if (!rr || !rr.code) return;
                            const c2 = hierarchyMaps.coreByCode[rr.code];
                            if (!c2 || !hierarchyMaps.isLeafByCode[rr.code]) return;
                            if (!c2.startsWith(prefix)) return;
                            sum += finalPreviewOf(rr);
                          });
                          return sum;
                        })();

                        return (
                          <TR
                            key={code || idx}
                            className="text-center border-t border-black/10 odd:bg-black/[0.02] even:bg-black/[0.04] hover:bg-black/[0.06] transition-colors
                                       dark:border-neutral-800 dark:odd:bg-white/5 dark:even:bg-white/10 dark:hover:bg-white/15"
                          >
                            <TD className="px-2 py-3">{toFaDigits(idx + 1)}</TD>

                            <TD className="px-2 py-3 text-center whitespace-nowrap">
                              <div
                                className="inline-flex items-center justify-center gap-1 flex-row-reverse"
                                style={{ paddingRight: node.depth ? node.depth * 12 : 0 }}
                              >
                                {hasChildren && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenCodes((prev) => ({ ...prev, [toggleKey]: !prev[toggleKey] }))
                                    }
                                    className="h-5 w-5 grid place-items-center rounded-md border border-black/25 bg-white text-black
                                               dark:border-neutral-500 dark:bg-white dark:text-black"
                                    aria-label={isOpen ? 'بستن زیرمجموعه' : 'باز کردن زیرمجموعه'}
                                  >
                                    {isOpen ? (
                                      <span className="text-[11px] leading-none text-black">−</span>
                                    ) : (
                                      <img src="/images/icons/afzodan.svg" alt="" className="w-3 h-3" />
                                    )}
                                  </button>
                                )}
                                <span className="ltr text-xs md:text-[13px]">{renderCode(code)}</span>
                              </div>
                            </TD>

                            <TD className="px-2 py-3 text-center break-words text-[11px] md:text-[13px] max-w-[180px]">
                              {r.name || '—'}
                            </TD>

                            {dynamicMonths.map((m) => {
                              let val = 0;

                              if (!isParent) {
                                if (r.months && r.months[m.key] != null) val = Number(r.months[m.key] || 0);
                                else val = Number((r.lastMonths && r.lastMonths[m.key]) || 0);
                              } else {
                                const core = hierarchyMaps.coreByCode[code];
                                if (core) {
                                  const prefix = core + '.';
                                  (rowsToRender || []).forEach((rr) => {
                                    if (!rr || !rr.code) return;
                                    const c2 = hierarchyMaps.coreByCode[rr.code];
                                    if (!c2 || !hierarchyMaps.isLeafByCode[rr.code]) return;
                                    if (!c2.startsWith(prefix)) return;

                                    let childVal = 0;
                                    if (rr.months && rr.months[m.key] != null) childVal = Number(rr.months[m.key] || 0);
                                    else childVal = Number((rr.lastMonths && rr.lastMonths[m.key]) || 0);

                                    if (childVal) val += childVal;
                                  });
                                }
                              }

                              const hasVal = !!val;

                              return (
                                <TD key={m.key} className="px-0 py-2 text-center align-middle">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!isParent) openMonthModal(r, m);
                                    }}
                                    disabled={isParent}
                                    className={`w-24 mx-auto h-12 md:w-24 md:h-12 rounded-2xl border text-[11px] md:text-[12px] flex items-center justify-center shadow-sm transition
                                      ${
                                        hasVal
                                          ? 'bg-[#edaf7c] border-[#edaf7c]/90 text-black'
                                          : 'bg-black/5 border-black/10 text-black/70 dark:bg-white/5 dark:border-neutral-700 dark:text-neutral-100'
                                      } ${isParent ? 'cursor-default' : 'cursor-pointer'}`}
                                  >
                                    {hasVal ? (
                                      <div className="flex flex-col items-center justify-center leading-tight">
                                        <span>{toFaDigits(formatMoney(val))}</span>
                                        <span className="mt-0.5 text-[10px] text-black/70 dark:text-neutral-300">
                                          ریال
                                        </span>
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
                                <span className="ltr">{toFaDigits(formatMoney(finalTotal || 0))}</span>
                                <span>ریال</span>
                              </span>
                            </TD>
                          </TR>
                        );
                      })}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TableWrap>

        {monthModal.open && (
          <div className="fixed inset-0 z-40 flex items-center justify-center px-3">
            <div
              className="absolute inset-0 bg-black/40 dark:bg-neutral-950/70 backdrop-blur-[2px]"
              onClick={closeMonthModal}
            />
            <div className="relative w-full max-w-sm rounded-2xl bg-white text-neutral-900 border border-black/10 shadow-2xl dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">ثبت برآورد ماهانه</div>
                  <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 space-y-0.5">
                    <div>
                      کد بودجه:{' '}
                      <b className="ltr text-xs">{monthModal.code ? renderCode(monthModal.code) : '—'}</b>
                    </div>
                    <div>
                      نام بودجه: <b>{monthModal.name || '—'}</b>
                    </div>
                    <div>
                      ماه: <b>{monthModal.label || '—'}</b>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeMonthModal}
                  className="h-8 w-8 grid place-items-center rounded-xl bg-black text-white dark:bg-neutral-100 dark:text-neutral-900"
                >
                  <img src="/images/icons/bastan.svg" alt="" className="w-4 h-4 invert dark:invert-0" />
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-neutral-600 dark:text-neutral-300">مبلغ برآورد برای این ماه</label>
                <div className="flex items-center gap-2">
                  <input
                    ref={monthInputRef}
                    dir="ltr"
                    className="flex-1 w-full rounded-xl px-3 py-2 text-sm text-center bg-white text-black placeholder-black/40 border border-black/15 outline-none
                               focus:ring-2 focus:ring-black/10
                               dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
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
                <button
                  type="button"
                  onClick={closeMonthModal}
                  className="h-9 px-4 rounded-xl border border-neutral-300 text-xs text-neutral-700 hover:bg-neutral-100
                             dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleMonthModalSave}
                  className="h-9 px-5 rounded-xl bg-neutral-900 text-xs text-white hover:bg-neutral-800
                             dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                  ثبت برآورد
                </button>
              </div>
            </div>
          </div>
        )}

        {err && <div className="text-sm text-red-600 dark:text-red-400 mt-3">{err}</div>}

        <div className="mt-4 flex items-center gap-2 justify-end">
          <button
            onClick={() => setShowModal(true)}
            className="h-10 w-14 grid place-items-center rounded-xl border border-black/15 bg-white text-black hover:bg-black/5
                       dark:border-neutral-700 dark:bg-white dark:text-black dark:hover:bg-black/10"
            disabled={active === 'projects' && !projectId}
            aria-label="نمایش"
            title="نمایش"
          >
            <img src="/images/icons/namayesh.svg" alt="" className="w-5 h-5" />
          </button>

          <button
            onClick={onUpdate}
            disabled={saving || (active === 'projects' && !projectId)}
            className="h-10 w-14 grid place-items-center rounded-xl bg-neutral-900 text-white disabled:opacity-50
                       dark:bg-neutral-100 dark:text-neutral-900"
            aria-label="بروزرسانی"
            title="بروزرسانی"
          >
            <img src="/images/icons/berozresani.svg" alt="" className="w-5 h-5 invert dark:invert-0" />
          </button>
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-2 sm:px-4">
            <div
              className="absolute inset-0 bg-black/35 dark:bg-neutral-950/60 backdrop-blur-[2px]"
              onClick={() => setShowModal(false)}
            />
            <div
              className="relative w-full max-w-3xl bg-white dark:bg-neutral-900 dark:text-neutral-100 rounded-2xl shadow-2xl border border-black/10 dark:border-neutral-800 overflow-hidden max-h-[90vh] flex flex-col"
              style={{ fontFamily: 'Vazirmatn, Vazir, IRANSans, Segoe UI, Tahoma, sans-serif' }}
            >
              <style>{`
                #estimate-preview * { font-family: Vazirmatn, Vazir, IRANSans, Segoe UI, Tahoma, sans-serif; }
                #estimate-preview table { border-collapse: collapse; }
                #estimate-preview thead th { background: #f8fafc; color:#0f172a; }
                #estimate-preview th, #estimate-preview td { border-top: 1px solid rgba(0,0,0,.08); }
                #estimate-preview .panel { border:1px solid rgba(0,0,0,.12); border-radius:16px; }
              `}</style>

              <div className="px-4 py-3 border-t border-black/10 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur shrink-0">
                <div className="flex flex-col items-center justify-center text-center gap-1">
                  <h2 className="text-sm md:text-base font-bold text-black dark:text-neutral-100">برآورد هزینه‌ها</h2>
                  <div className="text-[11px] md:text-xs text-black/70 dark:text-neutral-300 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                    {me && (
                      <span>
                        کاربر:{' '}
                        <b className="text-black dark:text-neutral-100">{me.name || me.username || me.email}</b>
                      </span>
                    )}
                    {active === 'projects' && selectedProject && (
                      <span>
                        پروژه:{' '}
                        <b className="text-black dark:text-neutral-100">
                          {toFaDigits(selectedProject.code)} — {selectedProject.name}
                        </b>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div id="estimate-preview" className="p-4 max-h-[70vh] overflow-auto space-y-4 text-center flex-1">
                <div className="overflow-auto rounded-xl ring-1 ring-black/10 dark:ring-neutral-800 panel">
                  <table className="w-full table-fixed text-[11px] md:text-xs text-center [&_th]:text-center [&_td]:text-center">
                    <thead className="bg-black/5 text-black sticky top-0">
                      <tr>
                        <th className="py-2.5 px-2 w-16 text-center">#</th>
                        <th className="py-2.5 px-2 w-40 text-center">کد بودجه</th>
                        <th className="py-2.5 px-2 text-center">نام بودجه</th>
                        {dynamicMonths.map((m) => (
                          <th key={m.key} className="py-2.5 px-2 w-24 text-center">
                            {m.label}
                          </th>
                        ))}
                        <th className="py-2.5 px-2 w-32 text-center border-l border-r border-black/10">جمع</th>
                      </tr>
                    </thead>
                    <tbody className="text-black dark:text-neutral-100">
                      {rowsToRender.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3 + dynamicMonths.length + 1}
                            className="py-6 text-black/60 dark:text-neutral-400 text-center"
                          >
                            موردی برای نمایش نیست.
                          </td>
                        </tr>
                      ) : (
                        <>
                          <tr className="border-t border-b border-black/10 bg-black/[0.04] font-semibold dark:border-neutral-800 dark:bg-white/10">
                            <td className="py-2 px-2 w-16 text-center">-</td>
                            <td className="py-2 px-2 w-40 text-center">-</td>
                            <td className="py-2 px-2 text-center">جمع</td>
                            {dynamicMonths.map((m) => (
                              <td key={m.key} className="py-2 px-2 w-24 text-center whitespace-nowrap">
                                {totalsByMonth[m.key] ? (
                                  <span className="inline-flex items-center justify-center gap-1">
                                    <span className="ltr">{toFaDigits(formatMoney(totalsByMonth[m.key]))}</span>
                                    <span>ریال</span>
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </td>
                            ))}
                            <td className="py-2 px-2 w-32 text-center whitespace-nowrap border-l border-r border-black/10">
                              <span className="inline-flex items-center justify-center gap-1">
                                <span className="ltr">{toFaDigits(formatMoney(totalGrand || 0))}</span>
                                <span>ریال</span>
                              </span>
                            </td>
                          </tr>

                          {rowsToRender.map((r, i) => (
                            <tr key={r.code || i} className="border-t border-black/10 dark:border-neutral-800">
                              <td className="py-2 px-2 w-16 text-center">{toFaDigits(i + 1)}</td>
                              <td className="py-2 px-2 w-40 whitespace-nowrap text-center ltr">{renderCode(r.code)}</td>
                              <td className="py-2 px-2 text-center break-words">{r.name || '—'}</td>
                              {dynamicMonths.map((m) => {
                                let val = 0;
                                if (r.months && r.months[m.key] != null) val = Number(r.months[m.key] || 0);
                                else val = Number((r.lastMonths && r.lastMonths[m.key]) || 0);
                                return (
                                  <td key={m.key} className="py-2 px-2 w-24 text-center whitespace-nowrap">
                                    {val ? (
                                      <span className="inline-flex items-center justify-center gap-1">
                                        <span className="ltr">{toFaDigits(formatMoney(val))}</span>
                                        <span>ریال</span>
                                      </span>
                                    ) : (
                                      '—'
                                    )}
                                  </td>
                                );
                              })}
                              <td className="py-2 px-2 w-32 text-center whitespace-nowrap border-l border-r border-black/10">
                                <span className="inline-flex items-center justify-center gap-1">
                                  <span className="ltr">{toFaDigits(formatMoney(finalPreviewOf(r) || 0))}</span>
                                  <span>ریال</span>
                                </span>
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="px-4 py-3 flex items-center justify-between gap-3 border-t border-black/10 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={printModal}
                    className="h-9 w-11 grid place-items-center rounded-xl border border-black/15 hover:bg-black hover:text-white transition dark:border-neutral-700"
                    aria-label="چاپ"
                    title="چاپ"
                  >
                    <img src="/images/icons/print.svg" alt="" className="w-5 h-5" />
                  </button>
                  <button
                    onClick={exportExcel}
                    className="h-9 w-11 grid place-items-center rounded-xl border border-black/15 hover:bg-black/5 transition dark:border-neutral-700 dark:hover:bg-neutral-800"
                    aria-label="خروجی اکسل"
                    title="خروجی اکسل"
                  >
                    <img src="/images/icons/excel.svg" alt="" className="w-5 h-5 invert dark:invert-0" />
                  </button>
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="h-9 w-11 grid place-items-center rounded-xl bg-black text-white dark:bg-neutral-100 dark:text-neutral-900"
                  aria-label="بستن"
                  title="بستن"
                >
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
