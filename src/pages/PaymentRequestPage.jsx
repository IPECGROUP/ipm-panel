// src/pages/PaymentRequestPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Card } from "../components/ui/Card";
import { Btn, LinkBtn } from "../components/ui/Button";
import { Tag } from "../components/ui/Tag";
import { InfoRow } from "../components/ui/InfoRow";
import { JalaliDatePicker } from "../components/JalaliDatePicker";
import { dayjs, todayJalaliYmd, isJalaliYmd } from "../utils/date";
import { useAuth } from "../components/AuthProvider";
import { isMainAdminUser } from "../utils/auth";
import { toEnglishDigits, format3 } from "../utils/format"; // اگر این‌ها رو استفاده می‌کنی
import { TableWrap, THead, TH, TR, TD } from "../components/ui/Table";



export default function PaymentRequestPage() {
  const api = async (path, opt = {}) => {
    const res = await fetch('/api' + path, {
      credentials: 'include',
      ...opt,
      headers: { 'Content-Type': 'application/json', ...(opt.headers || {}) },
    });
    const txt = await res.text();
    let data = {};
    try { data = txt ? JSON.parse(txt) : {}; } catch {}
    if (!res.ok) throw new Error(data?.error || data?.message || 'request_failed');
    return data;
  };

  const toEnDigits = (s) => String(s || '')
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));

  // تبدیل هر رقم انگلیسی به رقم فارسی برای نمایش
  const toFaDigits = (s) =>
    String(s ?? '').replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

  const formatMoney = (n) => {
    if (n === null || n === undefined) return '';
    const sign = n < 0 ? '-' : '';
    const s = String(Math.abs(Number(n) || 0));
    return sign + s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  const parseMoney = (s) => {
    if (s == null) return 0;
    const sign = /^\s*-/.test(String(s)) ? -1 : 1;
    const d = toEnDigits(String(s)).replace(/[^\d]/g, '');
    if (!d) return 0;
    return sign * parseInt(d, 10);
  };

  const fmtDateFa = (iso) => {
    if (!iso) return '—';
    const dt = new Date(iso);
    try {
      return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { dateStyle: 'short' }).format(dt);
    } catch {
      return dt.toLocaleDateString('fa-IR');
    }
  };
  const fmtTimeFa = (iso) => {
    if (!iso) return '—';
    const dt = new Date(iso);
    try {
      return new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(dt);
    } catch {
      return dt.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    }
  };

  // ===== مراحل (واحدهای گردش کار) برای Pill وضعیت =====
  const stageMap = {
    planning:           { label: 'در انتظار واحد برنامه‌ریزی/کنترل پروژه',  bg: '#abffff' },
    project_management: { label: 'در انتظار واحد مدیریت پروژه',            bg: '#ffdebc' },
    finance:            { label: 'در انتظار واحد مالی/حسابداری',           bg: '#becdff' },
    payment_order:      { label: 'در انتظار مدیریت / دستور پرداخت',        bg: '#b3f4b8' },
  };
  const stageOrder = ['planning','project_management','finance','payment_order'];
  const nextStage = (cur) => {
    const i = stageOrder.indexOf(cur);
    return (i >= 0 && i < stageOrder.length - 1) ? stageOrder[i + 1] : null;
  };
  const prevStage = (cur) => {
    const i = stageOrder.indexOf(cur);
    return (i > 0) ? stageOrder[i - 1] : null;
  };

  const guessStageKeyForRow = (row) => {
    const wfRaw = (
      row.workflow_unit ??
      row.workflowUnit ??
      row.stageKey ??
      row.stage_key ??
      row.stage ??
      row.wfStage ??
      row.wf_state ??
      ''
    ).toString().toLowerCase();

    if (stageOrder.includes(wfRaw)) return wfRaw;
    if (wfRaw.includes('planning') || wfRaw.includes('program') || wfRaw.includes('control')) return 'planning';
    if (wfRaw.includes('project')) return 'project_management';
    if (wfRaw.includes('finance') || wfRaw.includes('account')) return 'finance';
    if (wfRaw.includes('payment') || wfRaw.includes('admin') || wfRaw.includes('manager')) return 'payment_order';

    const fa = (row.lastStatusFa || row.last_status_fa || row.last_state_fa || '').toString();
    if (fa.includes('برنامه') || fa.includes('کنترل')) return 'planning';
    if (fa.includes('مدیریت پروژه')) return 'project_management';
    if (fa.includes('مالی') || fa.includes('حسابداری')) return 'finance';
    if (fa.includes('دستور پرداخت') || fa.includes('مدیریت')) return 'payment_order';

    const rawRole = (row.currentRole || row.current_role || '').toString().toLowerCase();
    if (rawRole.includes('برنامه') || rawRole.includes('کنترل') || rawRole.includes('planning') || rawRole.includes('control')) return 'planning';
    if (rawRole.includes('مدیریت پروژه') || rawRole.includes('project')) return 'project_management';
    if (rawRole.includes('مالی') || rawRole.includes('حسابداری') || rawRole.includes('finance') || rawRole.includes('account')) return 'finance';
    if (rawRole.includes('مدیر') || rawRole.includes('ادمین') || rawRole.includes('admin') || rawRole.includes('manager') || rawRole.includes('payment')) return 'payment_order';

    return null;
  };

  const unitFromRole = (roleInput='') => {
    const flat = Array.isArray(roleInput) ? roleInput.join(' ') : (roleInput ?? '');
    const r = flat.toString().toLowerCase();
    if (!r) return null;
    if (r.includes('برنامه') || r.includes('کنترل')) return 'planning';
    if (r.includes('مدیریت پروژه') || r.includes('پروژه')) return 'project_management';
    if (r.includes('حسابداری') || r.includes('مالی')) return 'finance';
    if (r.includes('مدیر') || r.includes('ادمین') || r.includes('دستور پرداخت')) return 'payment_order';
    if (r.includes('planning') || r.includes('control')) return 'planning';
    if (r.includes('project')) return 'project_management';
    if (r.includes('account') || r.includes('finance')) return 'finance';
    if (r.includes('admin') || r.includes('owner') || r.includes('superadmin') || r.includes('manager') || r.includes('management') || r.includes('payment')) return 'payment_order';
    return null;
  };

  const vazirFont =
    "Vazirmatn, Vazir, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  const workflowStepsByScope = {
    office:   ['creator', 'accounting_specialist', 'finance_manager', 'payment_order', 'payment_done'],
    site:     ['creator', 'project_control', 'accounting_specialist', 'finance_manager', 'payment_order', 'payment_done'],
    finance:  ['creator', 'finance_manager', 'payment_order', 'payment_done'],
    cash:     ['creator', 'payment_order', 'payment_done'],
    capex:    ['creator', 'project_control', 'accounting_specialist', 'finance_manager', 'payment_order', 'payment_done'],
    projects: ['creator', 'project_control', 'project_manager', 'accounting_specialist', 'finance_manager', 'payment_order', 'payment_done'],
  };

  const workflowStepMeta = {
    creator:               { label: 'درخواست‌کننده',        color: '#e5e7eb' },
    project_control:       { label: 'کنترل پروژه',          color: '#b1feff' },
    project_manager:       { label: 'مدیر پروژه',           color: '#fee1b9' },
    accounting_specialist: { label: 'کارشناس حسابداری',    color: '#c2cdff' },
    finance_manager:       { label: 'مدیر مالی',            color: '#c4b5fd' },
    payment_order:         { label: 'مدیریت / دستور پرداخت',         color: '#a9efa4' },
    payment_done:          { label: 'انجام پرداخت',         color: '#d4d4d8' },
  };

  const getWorkflowStepsForScope = (scope) => {
    const key = (scope || 'office').toString();
    const arr = workflowStepsByScope[key] || workflowStepsByScope.office;
    return arr.map((stepKey, idx) => ({
      key: stepKey,
      index: idx,
      label: workflowStepMeta[stepKey]?.label || '',
      color: workflowStepMeta[stepKey]?.color || '#e5e7eb',
    }));
  };

  // --- FIX نقش‌ها (شامل executive / مدیریت و درخواست‌کننده) ---
  const roleToStepKey = (roleInput = '') => {
    const s = (roleInput || '').toString().toLowerCase();
    if (!s) return null;

    if (
      s.includes('creator') ||
      s.includes('requester') ||
      s.includes('درخواست‌کننده') ||
      s.includes('درخواست کننده')
    ) {
      return 'creator';
    }

    if (s.includes('project_control') || s.includes('کنترل پروژه') || s.includes('planning')) {
      return 'project_control';
    }

    if (s.includes('project_manager') || s.includes('مدیر پروژه')) {
      return 'project_manager';
    }

    if (s.includes('accounting') || s.includes('حسابداری') || s.includes('کارشناس حسابداری')) {
      return 'accounting_specialist';
    }

    if (s.includes('finance_manager') || (s.includes('manager') && s.includes('مالی'))) {
      return 'finance_manager';
    }

    if (
      s.includes('executive') ||
      s.includes('payment') ||
      s.includes('دستور پرداخت') ||
      s.includes('مدیریت') ||
      (s.includes('manager') && !s.includes('مالی'))
    ) {
      return 'payment_order';
    }

    return null;
  };

    const getCurrentStepKeyForRow = (row) => {
    if (!row) return 'creator';

    // ۱) اول از current_role استفاده کن (اولویت اول و قطعی)
    const currentRoleRaw = 
      row.current_role || 
      row.currentRole || 
      row.assigned_user_role || 
      row.assignedUserRole ||
      row.current_role_from_action ||  // اگر بعداً اضافه کردی
      '';
    
    if (currentRoleRaw) {
      const fromCurrent = roleToStepKey(currentRoleRaw);
      if (fromCurrent) return fromCurrent;
    }

    // ۲) اگر current_role نبود یا مپ نشد، از history آخرین to_role رو بگیر
    const lastMove = [...row.actions].reverse().find(a => {
  const t = (a.action || a.type || '').toString().toLowerCase();
  return t === 'status' || t === 'approve' || t === 'approved' || t === 'reject' || t === 'rejected' || t === 'returned' || t === 'return';
});
if (lastMove && lastMove.to_role) {
  const fromHistory = roleToStepKey(lastMove.to_role);
  if (fromHistory) return fromHistory;
}


    // ۳) فقط اگر هیچی نبود، به روش‌های قدیمی فال‌بک کن
    const steps = getWorkflowStepsForScope(row.scope || 'office');
    const status = (row.status || '').toString().toLowerCase();

    if (status === 'approved' && steps.some(st => st.key === 'payment_done')) {
      return 'payment_done';
    }

    let roleRaw = 
      row.assignedRole ||
      row.assigned_user_role ||
      row.currentRole ||
      row.current_role ||
      row.workflow_unit ||
      row.workflowUnit ||
      '';

    let mappedKey = roleToStepKey(roleRaw);
    if (mappedKey) return mappedKey;

    // آخرین تلاش: از scope و مرحله حدس بزن
    const stageKey = row.stageKey || row.workflowUnit || guessStageKeyForRow(row);
    const s = (stageKey || '').toString().toLowerCase();
    if (s.includes('planning') || s.includes('control')) return 'project_control';
    if (s.includes('finance') || s.includes('account')) return 'finance_manager';
    if (s.includes('payment') || s.includes('executive') || s.includes('manager')) return 'payment_order';

    return steps[0]?.key || 'creator';
  };


  const hasPaymentOrderApproved = (row) => {
    if (!row || !Array.isArray(row.actions)) return false;

    return row.actions.some((a) => {
      const actType = (a.action || a.type || '').toString().toLowerCase();
      const statusVal = (a.status || '').toString().toLowerCase();
      const noteVal = (a.note || a.comment || '').toString().toLowerCase();

      const toKey   = roleToStepKey(a.to_role || a.current_role || '');
      const fromKey = roleToStepKey(a.from_role || '');

      const isPaymentOrderRole =
        toKey === 'payment_order' || fromKey === 'payment_order';

      const isApproved =
        statusVal === 'approved' ||
        actType === 'approved' ||
        actType === 'approve' ||
        /status=approved/.test(noteVal);

      return isPaymentOrderRole && isApproved;
    });
  };





    const StatusPill = (row) => {
    const steps = getWorkflowStepsForScope(row.scope || 'office');
    const stepKey = getCurrentStepKeyForRow(row);
    const meta = workflowStepMeta[stepKey] || steps[0] || workflowStepMeta.creator;
    const st = (row.status || '').toString().toLowerCase();

    const afterPaymentOrder = hasPaymentOrderApproved(row);

    let labelText = '';
    if (st === 'pending') {
      // بعد از تأیید مدیریت / دستور پرداخت و برگشت به مدیر مالی
      if (stepKey === 'finance_manager' && afterPaymentOrder) {
        labelText = 'در انتظار پرداخت';
      } else {
        labelText = `در انتظار تایید ${meta.label || '—'}`;
      }
    } else if (stepKey === 'payment_done' && st === 'approved') {
      // مرحله نهایی: انجام پرداخت
      labelText = 'انجام پرداخت';
    } else {
      labelText = meta.label || '—';
    }

    let bgColor = meta.color || '#e5e7eb';
    let textColor = '#111827'; // شبیه text-neutral-900

    // رنگ سبز مخصوص «انجام پرداخت»
    if (stepKey === 'payment_done' && st === 'approved') {
      bgColor = '#008000';
      textColor = '#ffffff';
    }

    return (
      <span
        className="px-2 py-0.5 rounded-lg text-[12px] leading-[1.1rem] inline-block whitespace-nowrap"
        style={{ background: bgColor, color: textColor }}
      >
        {labelText}
      </span>
    );
  };


  const todayFa = React.useMemo(() => {
    try {
      return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { dateStyle: 'medium' }).format(new Date());
    } catch {
      return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    }
  }, []);

  const computeSerialParts = React.useCallback(() => {
    let y4 = '1400', y2 = '00', m2 = '01';
    try {
      const df = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: '2-digit' });
      const parts = df.formatToParts(new Date());
      const yRaw = parts.find(p => p.type === 'year')?.value || '1400';
      const mRaw = parts.find(p => p.type === 'month')?.value || '01';
      const y = toEnDigits(yRaw).replace(/[^\d]/g, '');
      const m = toEnDigits(mRaw).replace(/[^\d]/g, '');
      y4 = y || '1400';
      y2 = (y4.slice(-2) || '00');
      m2 = (m || '1').toString().padStart(2, '0');
    } catch {
      const d = new Date();
      const m = (d.getMonth() + 1);
      const y = d.getFullYear().toString();
      y4 = y;
      y2 = (y.slice(-2) || '00');
      m2 = String(m).padStart(2,'0');
    }
    return { y4, y2, m2 };
  }, []);

  const getNextSerialPR = React.useCallback(() => {
    const { y4, y2, m2 } = computeSerialParts();
    const seqKey = `pr_seq_${y4}${m2}`;
    const last = Number(localStorage.getItem(seqKey) || '0');
    const next = String(last + 1).padStart(3, '0');
    return `PR${y2}${m2}${next}`;
  }, [computeSerialParts]);

  const consumeSerialPR = React.useCallback(() => {
    const { y4, y2, m2 } = computeSerialParts();
    const seqKey = `pr_seq_${y4}${m2}`;
    const last = Number(localStorage.getItem(seqKey) || '0') + 1;
    localStorage.setItem(seqKey, String(last));
    const next = String(last).padStart(3, '0');
    return `PR${y2}${m2}${next}`;
  }, [computeSerialParts]);

  const [previewSerial, setPreviewSerial] = React.useState(getNextSerialPR());
  React.useEffect(() => { setPreviewSerial(getNextSerialPR()); }, [getNextSerialPR]);

  const tabs = [
    { id: 'office', label: 'دفتر مرکزی', prefix: 'OB' },
    { id: 'site', label: 'سایت', prefix: 'SB' },
    { id: 'finance', label: 'مالی', prefix: 'FB' },
    { id: 'cash', label: 'نقدی', prefix: 'CB' },
    { id: 'capex', label: 'سرمایه‌ای', prefix: 'IB' },
    { id: 'projects', label: 'پروژه‌ها', prefix: '' },
  ];
  const prefixOf = (k) => tabs.find(t => t.id === k)?.prefix || '';
  const [active, setActive] = React.useState('office');

  const [projects, setProjects] = React.useState([]);
  const [projectId, setProjectId] = React.useState('');
  const selectedProject = React.useMemo(
    () => (projects || []).find(p => String(p.id) === String(projectId)),
    [projects, projectId]
  );

  const sortedProjects = React.useMemo(() => {
    return (projects || []).slice().sort((a, b) => {
      const ca = String(a?.code || ''), cb = String(b?.code || '');
      const byCode = ca.localeCompare(cb, 'fa', { numeric: true, sensitivity: 'base' });
      if (byCode !== 0) return byCode;
      return String(a?.name || '').localeCompare(String(b?.name || ''), 'fa', { numeric: true, sensitivity: 'base' });
    });
  }, [projects]);

  React.useEffect(() => {
    let stop = false;
    (async () => {
      try { const r = await api('/projects'); if (!stop) setProjects(r.projects || []); } catch {}
    })();
    return () => { stop = true; };
  }, []);

  const [me, setMe] = React.useState(null);
React.useEffect(() => {
  (async () => {
    try {
      const r = await api('/auth/me');
      const user = r.user || null;
      React.useEffect(() => {
  (async () => {
    try {
      const r = await api('/auth/me');
      const user = r.user || null;

      if (user) {
        // نقش‌ها را فقط از فیلدهای نقش بخوان (واقعی)
        const roleCandidates = []
          .concat(user.current_role || user.currentRole || [])
          .concat(user.role || [])
          .concat(user.roles || [])
          .concat(user.user_roles || [])
          .concat(user.permissions || [])
          .flat()
          .filter(Boolean);

        let detected = null;
        for (const x of roleCandidates) {
          const k = roleToStepKey(x);
          if (k) { detected = k; break; }
        }

        user.detectedRole = detected; // مثل: 'finance_manager'، 'project_control'، ...
      }

      setMe(user);
    } catch {}
  })();
}, []);

      setMe(user);
    } catch {}
  })();
}, []);



 const isAdmin = React.useMemo(() => {
  if (!me) return false;

  // فلگ‌های مستقیم بک‌اند (اگر در آینده اضافه شد)
  if (
    me.is_admin ||
    me.isAdmin ||
    me.isSuperAdmin ||
    me.is_main_admin ||
    me.isMainAdmin
  ) {
    return true;
  }

  // یوزر اصلی سیستم
  if (String(me.username || '').toLowerCase() === 'marandi') {
    return true;
  }

  // نقش ادمین
  if (String(me.role || '').toLowerCase() === 'admin') {
    return true;
  }

  // دسترسی سراسری
  if (Array.isArray(me.access_labels) && me.access_labels.includes('all')) {
    return true;
  }

  return false;
}, [me]);




  const allowedCenterTabs = React.useMemo(() => {
    // تا وقتی کاربر نیومده، همه رو نشون بده
    if (!me) return tabs;
    // ادمین همه گزینه‌ها رو می‌بیند
    if (isAdmin) return tabs;

    const ids = new Set();

    const pushKind = (kind) => {
      if (!kind) return;
      const k = kind.toString().toLowerCase();
      const hit = tabs.find(t => t.id === k);
      if (hit) ids.add(hit.id);
    };

    const inferFromName = (name) => {
      const n = (name || '').toString().toLowerCase();
      if (!n) return;
      if (n.includes('دفتر') || n.includes('مرکزی') || n.includes('office')) pushKind('office');
      if (n.includes('سایت') || n.includes('site')) pushKind('site');
      if (n.includes('مالی') || n.includes('finance')) pushKind('finance');
      if (n.includes('نقد') || n.includes('cash')) pushKind('cash');
      if (n.includes('سرمایه') || n.includes('capex')) pushKind('capex');
      if (n.includes('پروژه') || n.includes('project')) pushKind('projects');
    };

    const unitsArrays = [];
    if (Array.isArray(me.units)) unitsArrays.push(me.units);
    if (Array.isArray(me.user_units)) unitsArrays.push(me.user_units);
    if (Array.isArray(me.unit_access)) unitsArrays.push(me.unit_access);

    unitsArrays.forEach(list => {
      (list || []).forEach(u => {
        if (!u) return;
        if (u.kind) {
          pushKind(u.kind);
        } else if (u.unit_kind) {
          pushKind(u.unit_kind);
        } else if (u.code) {
          inferFromName(u.code);
        } else if (u.name) {
          inferFromName(u.name);
        }
      });
    });

    // اگر از واحدها چیزی درنیومد، از دپارتمان حدس بزنیم
    if (!ids.size) {
      inferFromName(me.department);
    }

    // اگر هنوز چیزی پیدا نشد، همه تب‌ها
    if (!ids.size) return tabs;

    return tabs.filter(t => ids.has(t.id));
  }, [me, isAdmin]);

  // اگر تب فعلی جزو تب‌های مجاز نیست، بنداز روی اولین تب مجاز
  React.useEffect(() => {
    if (!allowedCenterTabs.length) return;
    setActive(prev =>
      allowedCenterTabs.some(t => t.id === prev) ? prev : allowedCenterTabs[0].id
    );
  }, [allowedCenterTabs]);




  const [userMap, setUserMap] = React.useState({});

  React.useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const resp = await api('/admin/users');
        if (stop) return;
        const list = resp?.items || resp?.users || resp?.data || [];
        const map = {};
        (list || []).forEach((u) => {
          const id = u.id ?? u.user_id ?? null;
          if (id == null) return;
          const name =
            u.name ||
            u.full_name ||
            u.display_name ||
            u.username ||
            u.email ||
            `کاربر #${id}`;
          map[String(id)] = name;
        });
        setUserMap(map);
      } catch {
      }
    })();
    return () => { stop = true; };
  }, []);

  const [sourceItems, setSourceItems] = React.useState([]);
  const [totals, setTotals] = React.useState({});
  const [budgetCode, setBudgetCode] = React.useState('');

  const reloadBudgetSources = React.useCallback(async () => {
    const qs2 = new URLSearchParams();
    qs2.set('kind', active);
    if (active === 'projects' && projectId) qs2.set('project_id', String(projectId));
    try {
      const sum = await api('/budget-allocations/summary?' + qs2.toString());
      setTotals(sum.totals || {});
    } catch { setTotals({}); }

    if (active !== 'projects') {
      try {
        const centersRes = await api(`/centers/${active}`);
        const items = (centersRes.items || []).map(c => ({
          code: c.code || c.center_code || c.suffix || '',
          name: c.description || c.center_desc || c.name || '',
          last_amount: 0,
        })).filter(it => it.code);
        setSourceItems(items);
      } catch {
        setSourceItems([]);
      }
      return;
    }

    if (!projectId || !selectedProject?.code) { setSourceItems([]); return; }
    try {
      const centers = await api('/centers/projects');
      const pCode = String(selectedProject.code || '').trim();
      const filtered = (centers.items || []).filter(c => String(c?.suffix || '').trim().startsWith(pCode));
      setSourceItems(filtered.map(c => ({ code: c.suffix, name: c.description || '', last_amount: 0 })));
    } catch { setSourceItems([]); }
  }, [active, projectId, selectedProject]);

  React.useEffect(() => {
    let abort = false;
    (async () => { await reloadBudgetSources(); if (abort) return; })();
    return () => { abort = true; };
  }, [active, projectId, reloadBudgetSources]);

  const renderBudgetCodeOnce = React.useCallback((code, scope) => {
    if (scope === 'projects') return String(code || '');
    const pref = String(prefixOf(scope) || '').toUpperCase();
    let raw = String(code || '').trim();
    if (pref) {
      const re = new RegExp('^' + pref + '[\\-\\.]?', 'i');
      raw = raw.replace(re, '').replace(/^[-.]/,'');
    }
    return pref ? `${pref}-${raw}` : raw;
  }, []);

  const sortedSourceItems = React.useMemo(() => {
    return (sourceItems || []).slice().sort((a, b) =>
      renderBudgetCodeOnce(a.code, active).localeCompare(
        renderBudgetCodeOnce(b.code, active),
        'fa',
        { numeric: true, sensitivity: 'base' }
      )
    );
  }, [sourceItems, active, renderBudgetCodeOnce]);

  const [titleInput, setTitleInput] = React.useState('');
  const [descInput, setDescInput] = React.useState('');

  const [amountStr, setAmountStr] = React.useState('');
  const [cashText, setCashText] = React.useState('');
  const [cashDate, setCashDate] = React.useState('');
  const [creditSection, setCreditSection] = React.useState('');
  const [creditPay, setCreditPay] = React.useState('');
  const [bankInfo, setBankInfo] = React.useState('');

  const [amountTooHigh, setAmountTooHigh] = React.useState(false);

  const docOptions = [
    { id: 'pre_invoice',     label: 'پیش فاکتور' },
    { id: 'invoice',         label: 'فاکتور' },
    { id: 'goods_services',  label: 'صورت حساب رسمی کالا و خدمات' },
    { id: 'other_invoice',   label: 'صورت حساب غیر رسمی' },
    { id: 'status_invoice',  label: 'صورت وضعیت' },
    { id: 'internal_list',   label: 'لیست پرداخت داخلی' },
    { id: 'gov_salary',      label: 'فیش بدهی دولتی' },
    { id: 'other',           label: 'سایر' },
  ];
  const [docId, setDocId] = React.useState('pre_invoice');
  const [docOther, setDocOther] = React.useState('');
  const [docNumber, setDocNumber] = React.useState('');
  const [docDate, setDocDate] = React.useState('');

    // --- Upload Doc Files ---
    // آپلود درخواست
   // ==== state / refs برای فایل‌ها ====
const [docFiles, setDocFiles] = React.useState([]); 
// هر آیتم: { id, name, size, type, status, progress, error, serverId, url }

const [uploadModalOpen, setUploadModalOpen] = React.useState(false);
const uploadInputRef = React.useRef(null);

const MAX_DOC_SIZE = 400 * 1024; // 400 KB

// ==== helperهای فشرده‌سازی تصویر ====
const readFileAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const canvasToBlob = (canvas, mimeType, quality) =>
  new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });

// فشرده‌سازی تصویر تا حدود ۴۰۰KB
const compressImageFile = async (file, maxSizeBytes = MAX_DOC_SIZE) => {
  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);

  const MAX_WIDTH = 1600;
  const scale = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
  const width = img.width * scale;
  const height = img.height * scale;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.9; // از ۰.۹ شروع کنیم که کیفیت بهتر بمونه
  let blob = await canvasToBlob(canvas, file.type || 'image/jpeg', quality);

  while (blob && blob.size > maxSizeBytes && quality > 0.5) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, file.type || 'image/jpeg', quality);
  }

  if (!blob || blob.size > maxSizeBytes) {
    throw new Error('امکان فشرده‌سازی تصویر تا ۴۰۰ کیلوبایت نیست، لطفاً تصویر را کوچک‌تر کنید.');
  }

  return new File([blob], file.name, { type: file.type || 'image/jpeg' });
};


// اگر تصویر بود فشرده می‌کند، اگر PDF بود فقط حجم را چک می‌کند
const ensureFileSizeUnderLimit = async (file) => {
  if (file.size <= MAX_DOC_SIZE) return file;

  if (file.type && file.type.startsWith('image/')) {
    return await compressImageFile(file, MAX_DOC_SIZE);
  }

  // برای PDF فشرده‌سازی سمت فرانت سنگین است
  throw new Error('حجم فایل PDF بیشتر از ۴۰۰ کیلوبایت است؛ لطفاً قبل از آپلود آن را کوچک کنید.');
};

// ==== ارسال فایل به بک‌اند ====
const uploadFileToServer = (file, onProgress) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload/payment-doc');
    xhr.withCredentials = true; // خیلی مهم: برای ارسال کوکی سشن

    const formData = new FormData();
    formData.append('file', file);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && typeof onProgress === 'function') {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
            resolve(data);
          } catch {
            resolve({});
          }
        } else {
          reject(new Error('خطا در آپلود فایل'));
        }
      }
    };

    xhr.onerror = () => reject(new Error('خطا در آپلود فایل'));

    xhr.send(formData);
  });
};

// ==== اضافه‌کردن فایل‌های انتخاب‌شده / درگ‌شده ====
// ==== اضافه‌کردن فایل‌های انتخاب‌شده / درگ‌شده ====
const addFilesToUpload = async (fileList) => {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  for (const rawFile of files) {
    // فقط تصویر و PDF مجاز است
    if (
      !(
        (rawFile.type && rawFile.type.startsWith('image/')) ||
        rawFile.type === 'application/pdf' ||
        rawFile.name.toLowerCase().endsWith('.pdf')
      )
    ) {
      alert('فقط تصویر و PDF مجاز است.');
      continue;
    }

    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const previewUrl =
      rawFile.type && rawFile.type.startsWith('image/')
        ? URL.createObjectURL(rawFile)
        : null;

    // رکورد اولیه
    setDocFiles((prev) => [
      ...prev,
      {
        id,
        name: rawFile.name,
        size: rawFile.size,
        type: rawFile.type,
        status: 'optimizing', // optimizing | uploading | done | error
        progress: 0,
        error: '',
        serverId: null,
        url: null,
        previewUrl, // برای پریویو کوچیک
      },
    ]);

    try {
      // ۱) فشرده‌سازی/بررسی حجم
      const optimized = await ensureFileSizeUnderLimit(rawFile);

      // ۲) وضعیت → uploading (previewUrl رو نگه می‌داریم چون ...f داریم)
      setDocFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                size: optimized.size,
                status: 'uploading',
                progress: 0,
                error: '',
              }
            : f
        )
      );

      // ۳) آپلود به سرور
      const res = await uploadFileToServer(optimized, (p) => {
        setDocFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, progress: p } : f))
        );
      });

      // ۴) موفقیت
      setDocFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                status: 'done',
                progress: 100,
                serverId: res.id ?? res.fileId ?? null,
                url: res.url ?? res.path ?? null,
              }
            : f
        )
      );
    } catch (e) {
      // خطا
      setDocFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                status: 'error',
                error:
                  e?.message ||
                  'خطا در آماده‌سازی یا آپلود فایل. لطفاً دوباره تلاش کنید.',
              }
            : f
        )
      );
    }
  }
};




// ==== هندلرهای input / drag & drop ====
const handleUploadInputChange = (e) => {
  const fl = e.target.files;
  if (fl && fl.length) {
    addFilesToUpload(fl);
    e.target.value = ''; // برای اینکه دوباره همان فایل را هم بتواند انتخاب کند
  }
};

const handleDropFiles = (e) => {
  e.preventDefault();
  e.stopPropagation();
  const fl = e.dataTransfer.files;
  if (fl && fl.length) addFilesToUpload(fl);
};

const handleDragOver = (e) => {
  e.preventDefault();
  e.stopPropagation();
};

const removeDocFile = (id) => {
  setDocFiles((prev) => {
    const target = prev.find((f) => f.id === id);
    if (target && target.previewUrl) {
      try {
        URL.revokeObjectURL(target.previewUrl);
      } catch {}
    }
    return prev.filter((f) => f.id !== id);
  });
  // اگر خواستی اینجا بعداً یک DELETE به بک‌اند هم اضافه کن
};


  const titleByDocs = React.useMemo(
    () => (docId === 'other'
      ? (docOther || 'سایر')
      : (docOptions.find(d => d.id === docId)?.label || '')),
    [docId, docOther]
  );

  const [currencyLabel, setCurrencyLabel] = React.useState('ریال');
  const [selectedCurrencyId, setSelectedCurrencyId] = React.useState(null);
  const [currencyModalOpen, setCurrencyModalOpen] = React.useState(false);
  const [currencyItems, setCurrencyItems] = React.useState([]);
  const [currencyLoading, setCurrencyLoading] = React.useState(false);
  const [currencyErr, setCurrencyErr] = React.useState('');
  const [currencySourceItems, setCurrencySourceItems] = React.useState([]);
  const [selectedCurrencySourceId, setSelectedCurrencySourceId] = React.useState(null);
  const [currencySourceLabel, setCurrencySourceLabel] = React.useState('');

  const [beneficiaryName, setBeneficiaryName] = React.useState('');

  const normalizeRequestRow = (r) => {
    if (!r) return null;
    const m = r.meta && typeof r.meta === 'object' ? r.meta : {};

    const statusRaw = (r.status || '').toString().toLowerCase();
    const isDeletedMeta = m.deleted === true || m.is_deleted === true;
    if (statusRaw === 'deleted' || isDeletedMeta) return null;

    if (m.form && !String(m.form).startsWith('payment_request')) return null;

    const amount = m.amount != null ? Number(m.amount) : (r.estimated_total != null ? Number(r.estimated_total) : 0);
    const cashAmount = m.cash_amount != null ? Number(m.cash_amount) : 0;

    const currentAssigneeId =
      r.current_assignee_user_id ??
      r.currentAssigneeUserId ??
      r.assigned_to_id ??
      r.assignedToId ??
      null;

    const currentRole =
      r.current_role ??
      r.currentRole ??
      r.assigned_user_role ??
      r.assignedUserRole ??
      null;

    const wfUnitRaw = r.workflow_unit ?? r.workflowUnit ?? null;
    const wfUnitNorm = (() => {
      const s = (wfUnitRaw || '').toString().toLowerCase();
      if (!s) return null;
      if (stageOrder.includes(s)) return s;
      if (s.includes('planning')) return 'planning';
      if (s.includes('project')) return 'project_management';
      if (s.includes('finance')) return 'finance';
      if (s.includes('payment')) return 'payment_order';
      return null;
    })();

    const stageKeyFromServer = (() => {
      const raw = r.stageKey ?? r.stage_key ?? wfUnitRaw;
      if (!raw) return null;
      const s = String(raw).toLowerCase();
      if (stageOrder.includes(s)) return s;
      if (s.includes('planning')) return 'planning';
      if (s.includes('project_management')) return 'project_management';
      if (s.includes('finance')) return 'finance';
      if (s.includes('payment')) return 'payment_order';
      return null;
    })();

    const historyRaw =
      r.history_json ??
      r.history ??
      m.history_json ??
      m.history ??
      null;

    let actions = Array.isArray(r.actions) ? r.actions : [];
    if (!actions.length && historyRaw) {
      if (Array.isArray(historyRaw)) {
        actions = historyRaw;
      } else if (typeof historyRaw === 'string' && historyRaw.trim()) {
        try {
          const parsed = JSON.parse(historyRaw);
          if (Array.isArray(parsed)) actions = parsed;
        } catch {}
      }
    }

    const createdAt = r.created_at || r.createdAt || null;

    return {
      ...r,
      createdById: r.created_by ?? m.createdById ?? null,
      createdByName: m.createdByName || r.created_by_username || r.created_by_email || null,
      serial: m.serial || r.serial || '',
      scope: m.scope || r.type || 'office',
      projectId: m.project_id || r.project_id || null,
      budgetCode: m.budget_code || r.sub_budget || '',
      title: m.title || m.desc || '',
      desc: m.desc || '',
      amount,
      cashText: cashAmount ? formatMoney(cashAmount) : '',
      cashDate: m.cash_date_jalali || '',
      creditSection: formatMoney(m.credit_amount != null ? m.credit_amount : (amount - cashAmount)),
      creditPay: m.credit_pay_desc || '',
      bankInfo: m.bank_info || '',
      docId: m.doc_id || 'pre_invoice',
      docOther: m.doc_other || '',
      docLabel: m.doc_label || (m.doc_id ? (docOptions.find(d => d.id === m.doc_id)?.label || 'سایر') : 'پیش فاکتور'),
      docNumber: m.doc_number || '',
      docDate: m.doc_date_jalali || '',
      currencyId: m.currency_id ?? null,
      currencyLabel: m.currency_label || 'ریال',
      currencySourceId: m.currency_source_id ?? null,
      currencySourceLabel: m.currency_source_label || '',
      beneficiaryName: m.beneficiary_name || '',
      createdAt,
      dateFa: createdAt ? fmtDateFa(createdAt) : '—',
      assignedToId: currentAssigneeId,
      assignedRole: currentRole,
      current_role: currentRole,
      currentRole: currentRole,
      workflowUnit: wfUnitNorm,
      stageKey: stageKeyFromServer || wfUnitNorm || guessStageKeyForRow({ ...r, currentRole }),
      status: r.status || 'pending',
      actions,
    };
  };

  const [items, setItems] = React.useState([]);
  const [editId, setEditId] = React.useState(null);

  React.useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const resp = await api('/requests');
        const list = Array.isArray(resp?.items)
          ? resp.items
          : Array.isArray(resp?.requests)
            ? resp.requests
            : Array.isArray(resp)
              ? resp
              : [];

        const normalized = (list || []).map(normalizeRequestRow).filter(Boolean);
        if (!stop) setItems(normalized);
      } catch {
      }
    })();
    return () => { stop = true; };
  }, []);

  const [openInfo, setOpenInfo] = React.useState(null);
  const toggleInfo = (e, rowId) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const POP_W = 224, POP_H = 110;
    let right = Math.max(8, window.innerWidth - rect.right);
    right = Math.min(right, window.innerWidth - 8 - POP_W);
    const below = rect.bottom + 8;
    const maxTop = window.innerHeight - 8 - POP_H;
    let top = below <= maxTop ? below : (rect.top - 8 - POP_H);
    if (top < 8) top = 8;
    setOpenInfo(prev => (prev && prev.id === rowId ? null : { id: rowId, top, right }));
  };

  React.useEffect(() => {
    const close = () => setOpenInfo(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, []);

  const [err, setErr] = React.useState('');
  const [reqErr, setReqErr] = React.useState({});

  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [pickerTarget, setPickerTarget] = React.useState(null);
  const [pickerErr, setPickerErr] = React.useState('');
  const monthsFa = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
  const jalaliToday = React.useMemo(() => {
    try {
      const df = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: '2-digit', day: '2-digit' });
      const parts = df.formatToParts(new Date());
      const y = toEnDigits(parts.find(p => p.type === 'year')?.value || '1400');
      const m = toEnDigits(parts.find(p => p.type === 'month')?.value || '01');
      const d = toEnDigits(parts.find(p => p.type === 'day')?.value || '01');
      return { y: parseInt(y,10), m: parseInt(m,10), d: parseInt(d,10) };
    } catch { return { y: 1400, m: 1, d: 1 }; }
  }, []);
  const [jYear, setJYear] = React.useState(jalaliToday.y);
  const [jMonth, setJMonth] = React.useState(jalaliToday.m);
  const [jDay, setJDay] = React.useState(jalaliToday.d);
  const daysInJMonth = (y, m) => (m >= 1 && m <= 6) ? 31 : (m >= 7 && m <= 11 ? 30 : 29);

  const jYears = React.useMemo(() => { const arr=[]; for (let y=1390; y<=1450; y++) arr.push(y); return arr; }, []);
  const openPicker = (target) => {
    setPickerTarget(target);
    if (target === 'doc') {
      if (docDate && /^\d{4}\/\d{2}\/\d{2}$/.test(docDate)) {
        const [Y,M,D] = docDate.split('/').map(n => parseInt(n,10));
        setJYear(Y); setJMonth(M); setJDay(Math.min(D, daysInJMonth(Y,M)));
      } else {
        const t = jalaliToday;
        setJYear(t.y);
        setJMonth(t.m);
        setJDay(t.d);
      }
    } else {
      if (cashDate && /^\d{4}\/\d{2}\/\d{2}$/.test(cashDate)) {
        const [Y,M,D] = cashDate.split('/').map(n => parseInt(n,10));
        setJYear(Y); setJMonth(M); setJDay(Math.min(D, daysInJMonth(Y,M)));
      } else {
        const t = jalaliToday;
        let ny = t.y;
        let nm = t.m;
        let nd = t.d + 1;
        const dim = daysInJMonth(ny, nm);
        if (nd > dim) {
          nd = 1;
          nm += 1;
          if (nm > 12) {
            nm = 1;
            ny += 1;
          }
        }
        setJYear(ny);
        setJMonth(nm);
        setJDay(nd);
      }
    }
    setPickerErr(''); setPickerOpen(true);
  };
  const confirmPick = () => {
    const d = String(jDay).padStart(2,'0');
    const m = String(jMonth).padStart(2,'0');
    const dateStr = `${jYear}/${m}/${d}`;
    if (pickerTarget === 'cash') {
      const c = { y: jYear, m: jMonth, d: jDay };
      const t = jalaliToday;
      const isNotAllowed =
        c.y < t.y ||
        (c.y === t.y && (c.m < t.m || (c.m === t.m && c.d <= t.d)));
      if (isNotAllowed) {
        setPickerErr('تاریخ پرداخت باید بعد از امروز باشد.');
        return;
      }
      setPickerErr('');
      setCashDate(dateStr);
      setPickerOpen(false);
      return;
    }
    if (pickerTarget === 'doc') {
      setPickerErr('');
      setDocDate(dateStr);
      setPickerOpen(false);
      return;
    }
    setPickerOpen(false);
  };
  const clearPick = () => {
    setPickerErr('');
    if (pickerTarget === 'cash') setCashDate('');
    if (pickerTarget === 'doc') setDocDate('');
    setPickerOpen(false);
  };

  React.useEffect(() => {
    const credit = parseMoney(amountStr) - parseMoney(cashText);
    setCreditSection(formatMoney(credit));
  }, [amountStr, cashText]);

  const creditIsZero = React.useMemo(() => parseMoney(creditSection) === 0, [creditSection]);
  const amountValue = React.useMemo(() => parseMoney(amountStr), [amountStr]);
  const amountFilled = amountValue > 0;
  const secondaryDisabled = !amountFilled;

  const usedForSelected = React.useMemo(() => {
    if (!budgetCode) return 0;
    return (items || []).reduce((sum, it) => {
      const sameScope = it.scope === active;
      const sameProj  = active !== 'projects' ? true : String(it.projectId || '') === String(projectId || '');
      const sameCode  = String(it.budgetCode || '') === String(budgetCode || '');
      return sameScope && sameProj && sameCode ? sum + Number(it.amount || 0) : sum;
    }, 0);
  }, [items, active, projectId, budgetCode]);

  const normalizedTotalsLookup = React.useCallback((code, scope) => {
    if (!code) return 0;
    const direct = totals[code];
    if (typeof direct === 'number') return direct;
    const rendered = renderBudgetCodeOnce(code, scope);
    const byRendered = totals[rendered];
    if (typeof byRendered === 'number') return byRendered;
    for (const [k, v] of Object.entries(totals || {})) {
      if (renderBudgetCodeOnce(k, scope) === rendered) return v || 0;
    }
    return 0;
  }, [totals, renderBudgetCodeOnce]);

  const availableForSelected = React.useMemo(() => {
    const cap = normalizedTotalsLookup(budgetCode, active);
    return Math.max(0, cap - usedForSelected);
  }, [normalizedTotalsLookup, budgetCode, active, usedForSelected]);

  const labelOfDoc = React.useCallback(
    (id, other) => (id === 'other'
      ? (other?.trim() || 'سایر')
      : (docOptions.find(d => d.id === id)?.label || '—')),
    []
  );

  React.useEffect(() => {
    const n = parseMoney(amountStr);
    setAmountTooHigh(!!budgetCode && n > availableForSelected);
  }, [amountStr, availableForSelected, budgetCode]);

  // helper: ارسال درخواست جدید به‌صورت multipart همراه با فایل‌ها
  // helper: ارسال درخواست جدید (بدنه JSON، بدون multipart)
const createRequestWithFiles = async (payload) => {
  return api('/requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};



  const onSubmit = async () => {
    setErr('');
    let newReqErr = {};
    const mark = (k) => { newReqErr[k] = 'این فیلد اجباری است'; };

    if (!titleInput.trim()) mark('title');
    if (!budgetCode.trim()) mark('budgetCode');
    if (active === 'projects' && !projectId) mark('projectId');

    if (docId === 'other' && !docOther.trim()) mark('docOther');
    if (!docNumber.trim()) mark('docNumber');
    if (!docDate.trim()) mark('docDate');

    if (!amountStr.trim()) mark('amount');
    if (!cashText.trim() && cashText.trim() !== '0') mark('cash');

    if (!beneficiaryName.trim()) mark('beneficiaryName');
    if (!bankInfo.trim()) mark('bankInfo');

    if (Object.keys(newReqErr).length > 0) {
      setReqErr(newReqErr);
      return;
    }
    setReqErr({});

    const amountNum = parseMoney(amountStr);
    const cashNum   = parseMoney(cashText);

    if (amountNum <= 0) { setErr('مبلغ درخواست باید بزرگ‌تر از صفر باشد.'); return; }
    if (cashNum < 0)    { setErr('مبلغ نقدی معتبر نیست.'); return; }

    if (cashNum > 0 && !cashDate) {
      setReqErr(prev => ({ ...prev, cashDate: 'این فیلد اجباری است' }));
      return;
    }

    if (cashDate) {
      const m = cashDate.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
      if (m) {
        const y = parseInt(m[1],10), mo = parseInt(m[2],10), d = parseInt(m[3],10);
        const t = jalaliToday;
        const isNotAllowed =
          y < t.y ||
          (y === t.y && (mo < t.m || (mo === t.m && d <= t.d)));
        if (isNotAllowed) {
          setErr('تاریخ پرداخت باید بعد از امروز باشد.');
          return;
        }
      }
    }

    if (!creditIsZero && !creditPay.trim()) {
      setReqErr(prev => ({ ...prev, creditPay: 'این فیلد اجباری است' }));
      return;
    }

    if (amountNum > availableForSelected) {
      setErr(`مبلغ وارد شده (${formatMoney(amountNum)}) از سقف باقی‌مانده (${formatMoney(availableForSelected)}) بیشتر است.`);
      return;
    }
    if (cashNum > amountNum) { setErr('مبلغ نقدی نمی‌تواند از مبلغ درخواست بیشتر باشد.'); return; }

    const serial = editId
  ? (items.find(x => x.id === editId)?.serial || previewSerial)
  : previewSerial;
    const nowIso = new Date().toISOString();

    const baseRow = {
      id: editId || (Date.now() + Math.random()),
      serial,
      dateFa: todayFa,
      createdAt: nowIso,
      scope: active,
      projectId: active === 'projects' ? (projectId || null) : null,
      budgetCode,
      title: titleInput || titleByDocs,
      desc: descInput || '',
      amount: amountNum,
      cashText,
      cashDate,
      creditSection: formatMoney(amountNum - cashNum),
      creditPay,
      bankInfo,
      docId,
      docOther,
      docLabel: labelOfDoc(docId, docOther),
      docNumber,
      docDate,
      currencyId: selectedCurrencyId,
      currencyLabel,
      currencySourceId: selectedCurrencySourceId,
      currencySourceLabel,
      beneficiaryName,
      createdById: me?.id ?? null,
      createdByName: me?.name || me?.username || me?.email || null,

      stageKey: 'planning',
      status: 'pending',
      orderNote: null,
      orderAt: null,
      actions: [],
      workflowUnit: 'planning',
    };

    const doneFilesForMeta = (docFiles || [])
  .filter(f => f.status === 'done' && (f.serverId || f.url))
  .map(f => ({
    id: f.serverId || null,
    url: f.url || null,
    name: f.name || '',
    size: f.size || 0,
    type: f.type || '',
  }));

    let serverRow = null;
    try {
      const meta = {
        form: 'payment_request_v1',
        serial: baseRow.serial,
        scope: baseRow.scope,
        project_id: baseRow.projectId,
        budget_code: baseRow.budgetCode,
        title: baseRow.title,
        desc: baseRow.desc,
        amount: baseRow.amount,
        cash_amount: cashNum,
        cash_date_jalali: baseRow.cashDate || null,
        credit_amount: amountNum - cashNum,
        credit_pay_desc: creditIsZero ? null : baseRow.creditPay,
        bank_info: baseRow.bankInfo || null,
        doc_id: baseRow.docId,
        doc_other: baseRow.docOther || null,
        doc_label: baseRow.docLabel,
        doc_number: baseRow.docNumber || null,
        doc_date_jalali: baseRow.docDate || null,
        currency_id: baseRow.currencyId || null,
        currency_label: baseRow.currencyLabel || 'ریال',
        currency_source_id: baseRow.currencySourceId || null,
        currency_source_label: baseRow.currencySourceLabel || null,
        beneficiary_name: baseRow.beneficiaryName || null,
        createdById: baseRow.createdById,
        createdByName: baseRow.createdByName,
        doc_files: doneFilesForMeta,

        // doc_files عمداً اینجا ست نمی‌شود؛ بک‌اند در حالت multipart با توجه به $_FILES آن را پر می‌کند
      };

      if (editId) {
        const payloadPatch = {
          id: editId,
          projectId: baseRow.projectId,
          subBudget: baseRow.budgetCode,
          estimatedTotal: baseRow.amount,
          items: [],
          costCentersText: [],
          meta,
        };
        await api(`/requests/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify(payloadPatch),
        });
        serverRow = null;
      } else {
        const payload = {
          projectId: baseRow.projectId,
          subBudget: baseRow.budgetCode,
          estimatedTotal: baseRow.amount,
          items: [],
          costCentersText: [],
          meta,
        };
        const resp = await createRequestWithFiles(payload);

        serverRow = resp?.request || resp?.data || resp || null;
      }
    } catch (e) {
      setErr(e?.message || 'خطا در ثبت روی سرور.');
      return;
    }

    const finalWorkflowUnit = (() => {
      const raw = serverRow?.workflow_unit ?? serverRow?.workflowUnit ?? baseRow.workflowUnit;
      const s = (raw || '').toString().toLowerCase();
      if (stageOrder.includes(s)) return s;
      if (s.includes('planning')) return 'planning';
      if (s.includes('project')) return 'project_management';
      if (s.includes('finance')) return 'finance';
      if (s.includes('payment')) return 'payment_order';
      return baseRow.workflowUnit;
    })();

    const finalStageKey = (() => {
      const raw = serverRow?.stageKey ?? serverRow?.stage_key ?? finalWorkflowUnit ?? baseRow.stageKey;
      const s = (raw || '').toString().toLowerCase();
      if (stageOrder.includes(s)) return s;
      if (s.includes('planning')) return 'planning';
      if (s.includes('project_management')) return 'project_management';
      if (s.includes('finance')) return 'finance';
      if (s.includes('payment')) return 'payment_order';
      return baseRow.stageKey;
    })();

    const finalRow = {
      ...baseRow,
      id: serverRow?.id ?? baseRow.id,
      serial: serverRow?.serial ?? baseRow.serial,
      status: serverRow?.status ?? baseRow.status,
      stageKey: finalStageKey,
      workflowUnit: finalWorkflowUnit,
      assignedToId: serverRow?.current_assignee_user_id ?? baseRow.assignedToId ?? null,
      assignedRole: serverRow?.current_role ?? baseRow.assignedRole ?? null,
    };

    

    setItems(prev => (editId ? prev.map(x => x.id === editId ? finalRow : x) : [finalRow, ...prev]));
    if (!editId) setPreviewSerial(getNextSerialPR());
    setEditId(null);
    setReqErr({});

    setAmountStr('');
    setCashText('');
    setCashDate('');
    setCreditSection('');
    setCreditPay('');
    setBankInfo('');
    setTitleInput('');
    setDescInput('');
    setDocId('pre_invoice');
    setDocOther('');
    setDocNumber('');
    setDocDate('');
    setCurrencyLabel('ریال');
    setSelectedCurrencyId(null);
    setSelectedCurrencySourceId(null);
    setCurrencySourceLabel('');
    setBeneficiaryName('');
    (docFiles || []).forEach(f => {
  if (f.previewUrl) {
    try { URL.revokeObjectURL(f.previewUrl); } catch {}
  }
});
    setDocFiles([]); // بعد از ثبت موفق، فایل‌ها را هم خالی کن
  };

  const onEdit = (id) => {
    const it = items.find(x => x.id === id);
    if (!it) return;

    setShowForm(true);
    setViewItem(null);

    setEditId(it.id);
    setActive(it.scope || 'office');
    setProjectId(String(it.projectId || ''));
    setBudgetCode(it.budgetCode || '');
    setTitleInput(it.title || '');
    setDescInput(it.desc || '');
    setAmountStr(formatMoney(it.amount || 0));
    setCashText(it.cashText || '');
    setCashDate(it.cashDate || '');
    setCreditSection(it.creditSection || '');
    setCreditPay(it.creditPay || '');
    setBankInfo(it.bankInfo || '');
    setDocId(it.docId || 'pre_invoice');
    setDocOther(it.docOther || '');
    setDocNumber(it.docNumber || '');
    setDocDate(it.docDate || '');
    setCurrencyLabel(it.currencyLabel || 'ریال');
    setSelectedCurrencyId(it.currencyId || null);
    setSelectedCurrencySourceId(it.currencySourceId || null);
    setCurrencySourceLabel(it.currencySourceLabel || '');
    setBeneficiaryName(it.beneficiaryName || '');
    setReqErr({});
    // در سناریوی ساده فعلاً فایل‌های قدیمی را دوباره لود نمی‌کنیم
  };

  const delItem = async (id) => {
    if (!confirm('حذف این ردیف؟')) return;
    const before = items;
    setItems(prev => (prev || []).filter(x => x.id !== id));
    try {
      await api(`/requests/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
      alert('حذف روی سرور انجام نشد: ' + (e?.message || 'خطای نامشخص'));
      setItems(before);
    }
  };

  const [showForm, setShowForm] = React.useState(false);
  const [filterScope, setFilterScope] = React.useState('');
  const filteredItems = React.useMemo(() => {
    let list = items || [];
    if (filterScope) {
      list = list.filter(it => it.scope === filterScope);
    }
    return list;
  }, [items, filterScope]);

  const myId = me?.id == null ? null : String(me.id);

  const myUnits = React.useMemo(() => {
    const set = new Set();
    const push = (val) => {
      if (!val) return;
      if (typeof val === 'string') {
        const u = unitFromRole(val);
        if (u) set.add(u);
        return;
      }
      if (Array.isArray(val)) {
        val.forEach(push);
        return;
      }
      if (typeof val === 'object') {
        if (val.code) {
          const u = unitFromRole(val.code);
          if (u) set.add(u);
        }
        if (val.name) {
          const u = unitFromRole(val.name);
          if (u) set.add(u);
        }
      }
    };
    push(me?.role);
    push(me?.roles);
    push(me?.permissions);
    push(me?.groups);
    push(me?.department);
    return Array.from(set);
  }, [me]);

  const myRoleTokens = React.useMemo(() => {
    const set = new Set();
    const push = (val) => {
      if (!val) return;
      if (typeof val === 'string') {
        const key = roleToStepKey(val);
        if (key) set.add(key);
        return;
      }
      if (Array.isArray(val)) {
        val.forEach(push);
        return;
      }
      if (typeof val === 'object') {
        if (val.code) push(val.code);
        if (val.name) push(val.name);
        if (val.title) push(val.title);
        if (val.role) push(val.role);
        if (val.role_code) push(val.role_code);
        Object.values(val).forEach((v) => {
          if (typeof v === 'string') push(v);
        });
      }
    };

    push(me?.role);
    push(me?.roles);
    push(me?.user_roles);
    push(me?.detectedRole);        // این خط جدید
    return Array.from(set);
  }, [me]);

 

  const roleTokensOfRow = (row) => {
    const out = [];
    const push = (val) => {
      if (!val) return;
      if (typeof val === 'string') {
        out.push(val.toLowerCase());
        return;
      }
      if (Array.isArray(val)) {
        val.forEach(push);
        return;
      }
      if (typeof val === 'object') {
        if (val.code) out.push(String(val.code).toLowerCase());
        if (val.name) out.push(String(val.name).toLowerCase());
        if (val.title) out.push(String(val.title).toLowerCase());
      }
    };
    push(row.assignedRole);
    push(row.assigned_role);
    push(row.assignedUserRole);
    push(row.assigned_user_role);
    push(row.currentRole);
    push(row.current_role);
    push(row.role);
    return out;
  };

  // --- FIX اصلی: فقط نفرِ نوبتی ببیند، نه همه‌ی واحد ---
      // --- FIX اصلی: نمایش بر اساس نقش مرحله فعلی، نه واحد کاربر ---
  // --- FIX اصلی: فقط نفرِ نوبتی ببیند، نه همه‌ی واحد ---
// نمایش بر اساس نقش مرحله فعلی (و در صورت وجود، assign به یک کاربر مشخص)
const isRowForMe = React.useCallback((row) => {
  if (!me || !row) return false;

  // ادمین اصلی همه درخواست‌ها را می‌بیند
  if (isAdmin) return true;

  const myIdStr = String(me.id ?? '');

  // درخواست‌های خودم در اینباکس نیاید
  if (row.createdById != null && String(row.createdById) === myIdStr) {
    return false;
  }

 const directRole =
  row.current_role ||
  row.currentRole ||
  row.assigned_user_role ||
  row.assignedUserRole ||
  '';

const currentStepKey = roleToStepKey(directRole) || getCurrentStepKeyForRow(row);

  if (!currentStepKey) return false;

  // اگر به کاربر مشخصی assign شده، فقط همان کاربر ببیند
  const assigneeId =
    row.assignedToId ??
    row.current_assignee_user_id ??
    row.currentAssigneeUserId ??
    null;

  if (assigneeId != null) {
    return String(assigneeId) === myIdStr;
  }

  // در غیر این صورت: مقایسه نقش مرحله فعلی با نقش‌های کاربر
  if (me.detectedRole && me.detectedRole === currentStepKey) {
    return true;
  }

  return myRoleTokens.includes(currentStepKey);
}, [me, isAdmin, myRoleTokens]);



  const mineItems = React.useMemo(() => {
    if (!myId) return [];
    return (items || []).filter((it) => {
      const meta = it.meta && typeof it.meta === 'object' ? it.meta : {};
      const cId =
        it.createdById ??
        it.created_by ??
        meta.createdById ??
        meta.created_by ??
        null;
      return cId != null && String(cId) === myId;
    });
  }, [items, myId]);

  const inboxItems = React.useMemo(() => {
    if (!me) return [];
    return (items || []).filter((it) => {
      const meta = it.meta && typeof it.meta === 'object' ? it.meta : {};
      const cId =
        it.createdById ??
        it.created_by ??
        meta.createdById ??
        meta.created_by ??
        null;
      const isMine = cId != null && myId && String(cId) === myId;
      return !isMine && isRowForMe(it);
    });
  }, [items, me, myId, isRowForMe]);

  const canTakeActionsFor = React.useCallback((row) => {
    if (!row || !me) return false;

    const meta = row.meta && typeof row.meta === 'object' ? row.meta : {};
    const creatorId =
      row.createdById ??
      row.created_by ??
      meta.createdById ??
      meta.created_by ??
      null;

    if (myId && creatorId != null && String(creatorId) === myId) {
      return false;
    }

    if (!isRowForMe(row)) return false;
    const st = (row.status || '').toString().toLowerCase();
    return st === 'pending';
  }, [me, myId, isRowForMe]);

  const [viewItem, setViewItem] = React.useState(null);

  const [orderModalOpen, setOrderModalOpen] = React.useState(false);
  const [orderText, setOrderText] = React.useState('');
  const openOrderModal = () => { setOrderText(''); setOrderModalOpen(true); };
  const confirmOrderNote = async () => {
    if (!viewItem) { setOrderModalOpen(false); return; }
    const now = new Date().toISOString();
    setItems(prev => prev.map(x => x.id === viewItem.id ? { ...x, orderNote: orderText || '—', orderAt: now } : x));
    setViewItem(v => v ? { ...v, orderNote: orderText || '—', orderAt: now } : v);
    setOrderModalOpen(false);
    try {
      await api('/requests/order-note', {
        method: 'POST',
        body: JSON.stringify({ id: viewItem.id, order_note: orderText || '—' }),
      });
    } catch {}
  };

  const scopeLabel = (id) => tabs.find(t => t.id === id)?.label || '—';
  const codeShown = (row) => renderBudgetCodeOnce(row.budgetCode, row.scope);

  const TableLikeInfo = ({ row }) => {
  const currency = row.currencyLabel || 'ریال';
  const docTitle =
    row.docLabel ||
    labelOfDoc(row.docId || 'pre_invoice', row.docOther || '');

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-black/10 text-neutral-900 dark:ring-white/10 dark:text-white">
      {/* هدر جدول */}
      <div className="bg-black/5 text-[13px] md:text-[14px] font-semibold px-3 py-2 text-center dark:bg-white/5 dark:text-white/80">
        جزئیات کامل
      </div>

      <table className="w-full text-[13px] md:text-[14px] text-center border-t border-black/10 dark:border-white/10">
        <tbody>
          {/* ردیف ۱: عنوان + شرح (شرح دو ستون) */}
          <tr className="border-b border-black/10 dark:border-white/10">
            <td className="py-2 px-2 border-l border-black/10 dark:border-white/10 align-top">
              <span className="text-neutral-700 dark:text-white/70">
                عنوان درخواست:{' '}
              </span>
              <span className="font-medium">
                {row.title || '—'}
              </span>
            </td>

            <td
              className="py-2 px-2 align-top"
              colSpan={2} // فقط شرح دو ستون می‌گیرد
            >
              <span className="text-neutral-700 dark:text-white/70">
                شرح:{' '}
              </span>
              <span className="font-medium">
                {row.desc || '—'}
              </span>
            </td>
          </tr>

          {/* ردیف ۲: مبلغ درخواست / نام ذینفع / اطلاعات بانکی ذینفع (هر کدام دقیقا یک ستون) */}
          <tr className="border-b border-black/10 dark:border-white/10">
            <td className="py-2 px-2 border-l border-black/10 dark:border-white/10 align-top">
              <span className="text-neutral-700 dark:text-white/70">
                مبلغ درخواست ({currency}):{' '}
              </span>
              <span
                className="ltr font-medium"
                style={{ fontFamily: vazirFont }}
              >
                {toFaDigits(formatMoney(row.amount || 0))}
              </span>
            </td>

            <td className="py-2 px-2 border-l border-black/10 dark:border-white/10 align-top">
              <span className="text-neutral-700 dark:text-white/70">
                نام ذینفع:{' '}
              </span>
              <span className="font-medium">
                {row.beneficiaryName || '—'}
              </span>
            </td>

            <td className="py-2 px-2 align-top">
              <span className="text-neutral-700 dark:text-white/70">
                اطلاعات بانکی ذینفع:{' '}
              </span>
              <span className="font-medium">
                {row.bankInfo || '—'}
              </span>
            </td>
          </tr>

          {/* ردیف ۳: نقدی / اعتباری / تاریخ + شرح پرداخت اعتباری */}
          <tr className="border-b border-black/10 dark:border-white/10">
            <td className="py-2 px-2 border-l border-black/10 dark:border-white/10 align-top">
              <span className="text-neutral-700 dark:text-white/70">
                مبلغ نقدی ({currency}):{' '}
              </span>
              <span
                className="ltr font-medium"
                style={{ fontFamily: vazirFont }}
              >
                {toFaDigits(row.cashText || '۰')}
              </span>
            </td>

            <td className="py-2 px-2 border-l border-black/10 dark:border-white/10 align-top">
              <span className="text-neutral-700 dark:text-white/70">
                مانده اعتباری ({currency}):{' '}
              </span>
              <span
                className="ltr font-medium"
                style={{ fontFamily: vazirFont }}
              >
                {toFaDigits(row.creditSection || '۰')}
              </span>
            </td>

            <td className="py-2 px-2 align-top">
              <div>
                <span className="text-neutral-700 dark:text-white/70">
                  تاریخ پرداخت:{' '}
                </span>
                <span className="font-medium">
                  {row.cashDate ? toFaDigits(row.cashDate) : '—'}
                </span>
              </div>
              <div className="mt-1">
                <span className="text-neutral-700 dark:text-white/70">
                  شرح پرداخت اعتباری:{' '}
                </span>
                <span className="font-medium">
                  {row.creditPay || '—'}
                </span>
              </div>
            </td>
          </tr>

          {/* ردیف ۴: نوع سند / شماره سند / تاریخ سند */}
          <tr>
            <td className="py-2 px-2 border-l border-black/10 dark:border-white/10 align-top">
              <span className="text-neutral-700 dark:text-white/70">
                نوع سند:{' '}
              </span>
              <span className="font-medium">
                {docTitle || '—'}
              </span>
            </td>

            <td className="py-2 px-2 border-l border-black/10 dark:border-white/10 align-top">
              <span className="text-neutral-700 dark:text-white/70">
                شماره سند:{' '}
              </span>
              <span className="font-medium">
                {row.docNumber || '—'}
              </span>
            </td>

            <td className="py-2 px-2 align-top">
              <span className="text-neutral-700 dark:text-white/70">
                تاریخ سند:{' '}
              </span>
              <span className="font-medium">
                {row.docDate ? toFaDigits(row.docDate) : '—'}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};






  const actionLabel = (tRaw) => {
    const t = (tRaw || '').toString();
    const s = t.toLowerCase();
    if (!t) return '—';
    if (s === 'approved' || s.includes('approved')) return 'تأیید';
    if (s === 'rejected' || s.includes('rejected')) return 'رد';
    if (s === 'returned' || s.includes('returned')) return 'برگشت';
    if (s === 'created' || s.includes('create')) return 'ایجاد';
    if (s.includes('status=pending')) return 'در انتظار';
    if (s.includes('status=approved')) return 'تأیید';
    if (s.includes('status=rejected')) return 'رد';
    if (s.includes('status=returned')) return 'برگشت';
    return t;
  };

  const getActionUserName = (row, a) => {
    const direct =
      a.by ||
      a.by_name ||
      a.byName ||
      a.user_name ||
      a.username ||
      a.user ||
      a.actor ||
      null;

    if (direct) return direct;

    const id =
      a.by_user_id ??
      a.user_id ??
      a.actor_id ??
      null;

    if (id == null) return '';

    const idStr = String(id);

    if (myId && idStr === myId) {
      return (
        me?.name ||
        me?.username ||
        me?.email ||
        `کاربر #${idStr}`
      );
    }

    if (userMap && userMap[idStr]) {
      return userMap[idStr];
    }

    const meta = row.meta && typeof row.meta === 'object' ? row.meta : {};
    const creatorId =
      row.createdById ??
      row.created_by ??
      meta.createdById ??
      meta.created_by ??
      null;

    if (creatorId != null && String(creatorId) === idStr) {
      return (
        row.createdByName ||
        row.created_by_username ||
        row.created_by_email ||
        meta.createdByName ||
        meta.created_by_username ||
        meta.created_by_email ||
        `کاربر #${idStr}`
      );
    }

    return `کاربر #${idStr}`;
  };

  // --- FIX: نقش ستون «توسط» از from_role برای status و از to_role برای create ---
    // --- FIX: نقش ستون «توسط» و برچسب پرداخت در آخرین مرحله ---
  const ActionHistory = ({ row }) => {
    const list = (row.actions || []).slice();
    if (list.length === 0) return null;

    const currentStepKeyRow = getCurrentStepKeyForRow(row);
    const rowStatus = (row.status || '').toString().toLowerCase();

    return (
      <div className="space-y-2">
        <div className="text-[12px] font-semibold text-neutral-800 dark:text-white/80">سوابق اقدام</div>
        <div className="overflow-hidden rounded-xl ring-1 ring-black/10 dark:ring-white/10">
          <table className="w-full text-[12px] text-right border border-black/10 dark:border-white/10">
            <thead className="bg-black/5 text-neutral-700 dark:bg-white/5 dark:text-white/80">
              <tr>
                <th className="py-1.5 px-2 w-24 border-b border-black/10 dark:border-white/10">اقدام</th>
                <th className="py-1.5 px-2 w-40 border-b border-black/10 dark:border-white/10">توسط</th>
                <th className="py-1.5 px-2 border-b border-black/10 dark:border-white/10">شرح</th>
                <th className="py-1.5 px-2 w-44 border-b border-black/10 dark:border-white/10">تاریخ و ساعت</th>
              </tr>
            </thead>
            <tbody>
              {list.map((a, i) => {
                let rawStatus =
                  a.status ||
                  a.action ||
                  a.type ||
                  a.kind ||
                  '';

                let noteRaw = a.note || a.comment || a.reason || '';

                // اگر status توی note است
                if ((!rawStatus || rawStatus === 'status') && typeof noteRaw === 'string') {
                  const m = noteRaw.match(/status=([a-z_]+)/i);
                  if (m) rawStatus = m[1];
                }

                let displayNote = noteRaw;
                if (
                  typeof displayNote === 'string' &&
                  /^status=(pending|approved|rejected|returned)$/i.test(displayNote.trim())
                ) {
                  displayNote = '—';
                }

                const label = actionLabel(rawStatus);
                const actType = (a.action || a.type || '').toString().toLowerCase();

                let roleForDisplay = '';
                if (actType === 'create') {
                  roleForDisplay =
                    a.to_role ||
                    a.by_role ||
                    a.role ||
                    a.from_role ||
                    a.current_role ||
                    '';
                } else if (actType === 'status') {
                  const toKeyTmp = roleToStepKey(a.to_role || a.current_role || '');
                  if (toKeyTmp === 'payment_done') {
                    roleForDisplay =
                      a.to_role ||
                      a.current_role ||
                      a.from_role ||
                      a.by_role ||
                      a.role ||
                      '';
                  } else {
                    roleForDisplay =
                      a.from_role ||
                      a.by_role ||
                      a.role ||
                      a.current_role ||
                      a.to_role ||
                      '';
                  }
                } else {
                  roleForDisplay =
                    a.by_role ||
                    a.role ||
                    a.from_role ||
                    a.current_role ||
                    a.to_role ||
                    '';
                }

                let stepKey = roleToStepKey(roleForDisplay);
                if (!stepKey) {
                  stepKey = 'creator';
                }

                const stepMeta = workflowStepMeta[stepKey] || workflowStepMeta.creator;

                // برچسب پیش‌فرض
                let displayLabel = label;

                // اگر آخرین اقدام و وضعیت ردیف approved و مرحله‌ی فعلی payment_done باشد → برچسب «پرداخت»
                const isLast = i === list.length - 1;
                if (
                  isLast &&
                  rowStatus === 'approved' &&
                  currentStepKeyRow === 'payment_done'
                ) {
                  displayLabel = 'پرداخت';
                } else if (
                  (rawStatus === 'approved' || label === 'تأیید') &&
                  stepKey === 'payment_done'
                ) {
                  // بکاپ قبلی: اگر خود رول هم payment_done بود
                  displayLabel = 'پرداخت';
                }

                const at = a.at || a.created_at || a.time || a.timestamp || null;

                return (
                  <tr key={i} className="border-t border-black/10 dark:border-white/10">
                    <td className="py-1.5 px-2">{displayLabel}</td>

                    <td className="py-1.5 px-2">
                      {(() => {
                        const isCreateAction =
                          actType === 'create' ||
                          rawStatus === 'created';

                        if (isCreateAction) {
                          const who = getActionUserName(row, a);
                          return <span>{who || '—'}</span>;
                        }

                        return (
                          <span
                            className="inline-block px-2 py-0.5 rounded-full text-[11px]"
                            style={{ backgroundColor: stepMeta.color }}
                          >
                            {stepMeta.label}
                          </span>
                        );
                      })()}
                    </td>

                    <td className="py-1.5 px-2">{displayNote || '—'}</td>
                    <td className="py-1.5 px-2">
                      {at ? (<>{fmtDateFa(at)} - {fmtTimeFa(at)}</>) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };


  const WorkflowTimelineDynamic = ({ row }) => {
    if (!row) return null;
    const steps = getWorkflowStepsForScope(row.scope || 'office');
    if (!steps.length) return null;

    const currentKey = getCurrentStepKeyForRow(row);
    let currentIndex = steps.findIndex(st => st.key === currentKey);
    if (currentIndex < 0) currentIndex = 0;
    if (currentIndex > steps.length - 1) currentIndex = steps.length - 1;

    const segments = Math.max(steps.length - 1, 0);
    const perSegment = segments > 0 ? 100 / segments : 0;
    const offsetPct = segments > 0 ? perSegment * 0.08 : 0;
    const highlightStart = segments > 0 ? currentIndex * perSegment + offsetPct : 0;
    const highlightWidth = segments > 0 ? Math.max(perSegment - 2 * offsetPct, 0) : 0;

    return (
      <div className="mt-3">
        <div className="text-xs text-neutral-700 dark:text-white/70 text-right mb-2">
          گردش کار فرآیند درخواست پرداخت
        </div>
        <div className="w-full px-2 md:px-4" dir="ltr">
          <div className="relative flex items-center justify-between w-full">
            {/* خط خاکستری اصلی (در مرکز دایره‌ها) */}
            <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-[2px] bg-neutral-300 dark:bg-neutral-700" />

            {/* دایره‌ها + تپش مرحله بعدی */}
            {steps.map((st, idx) => {
              const done = idx <= currentIndex;
              const isNext = idx === currentIndex + 1 && idx < steps.length;
              const isEdge = idx === 0 || idx === steps.length - 1;

              return (
                <div
                  key={st.key + idx}
                  className="relative flex flex-col items-center flex-1 text-center"
                >
                  <div
                    className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center shadow-sm z-[1]
                      ${done
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-400 text-white dark:bg-neutral-600 dark:text-white'
                      } ${(!isEdge && isNext) ? 'pr-dot-pulse' : ''}`}
                    style={{ fontFamily: vazirFont, fontSize: '13px' }}
                  >
                    {toFaDigits(st.key === 'creator' ? 0 : st.index)}
                  </div>
                  <div className="mt-1 text-[10px] md:text-[11px] text-neutral-800 dark:text-white/80">
                    <span
                      className="inline-block px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: st.color }}
                    >
                      {st.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const ModalView = ({ row }) => {
    if (!row) return null;
    const createdDate = fmtDateFa(row.createdAt) || row.dateFa || '—';
    const createdTime = fmtTimeFa(row.createdAt);

    return (
      <div className="space-y-2.5 text-[13px] text-neutral-900 dark:text-white">
        <div className="relative -mt-1 pb-1">
          <div className="flex flex-col items-center gap-1">
            <img src="/images/light.png" alt="logo" className="h-12 object-contain block dark:hidden" />
            <img src="/images/dark.JPG"  alt="logo" className="h-12 object-contain hidden dark:block" />
            <div className="text-[15px] md:text-[17px] font-bold text-neutral-800 dark:text-white/90 mt-1">
              مدیریت یکپارچه فرآیندهای شرکت ایده پویان انرژی
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 items-center gap-2">
          <div className="text-right">
            <b>شماره درخواست:</b>{' '}
            <span className="ltr" style={{ fontFamily: vazirFont }}>{row.serial || '—'}</span>
          </div>
          <div className="text-center font-bold text-[16px]">درخواست پرداخت</div>
          <div className="text-left"><b>تاریخ و ساعت:</b> {createdDate} - {createdTime}</div>
        </div>

        <div className="h-px bg-black/10 dark:bg-white/10" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-right">
          <div className="space-y-0.5">
  <div>
    <span className="text-neutral-700 dark:text-white/70">درخواست کننده:</span>{' '}
    <span className="font-medium text-[13px] md:text-[14px]">
      {row.createdByName || '—'}
    </span>
  </div>
  <div>
    <span className="text-neutral-700 dark:text-white/70">کد بودجه:</span>{' '}
    <span
      className="ltr font-medium text-[13px] md:text-[14px]"
      style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif' }}
    >
      {toEnDigits(codeShown(row) || '—')}
    </span>
  </div>
</div>


          <div className="space-y-0.5">
  <div>
    <span className="text-neutral-700 dark:text-white/70">مرکز بودجه:</span>{' '}
    <span className="font-medium text-[13px] md:text-[14px]">
      {tabs.find(t=>t.id===row.scope)?.label || '—'}
    </span>
  </div>
  {row.status && (
    <div>
      <span className="text-neutral-700 dark:text-white/70">آخرین وضعیت:</span>{' '}
      <span className="font-medium text-[13px] md:text-[14px]">
        {StatusPill(row)}
      </span>
    </div>
  )}
</div>

        </div>

        <div className="h-px bg-black/10 dark:bg-white/10" />

        <TableLikeInfo row={row} />

        <div className="h-px bg-black/10 dark:bg-white/10" />

        <WorkflowTimelineDynamic row={row} />

        <ActionHistory row={row} />

      </div>
    );
  };

   const printRow = (row) => {
  if (!row) return;

  const w = window.open('', '_blank');
  if (!w) return;

  const createdDate = fmtDateFa(row.createdAt) || row.dateFa || '—';
  const createdTime = fmtTimeFa(row.createdAt);
  const _scopeLabel = scopeLabel(row.scope);
  const _code = codeShown(row);
  const _currencyLabel = row.currencyLabel || 'ریال';

  const amountFormatted = toFaDigits(formatMoney(row.amount || 0));
  const cashFormatted   = toFaDigits(row.cashText || '0');
  const creditFormatted = toFaDigits(row.creditSection || '0');
  const cashDateFa      = row.cashDate ? toFaDigits(row.cashDate) : '—';
  const docDateFa       = row.docDate ? toFaDigits(row.docDate) : '—';

  const docTitle =
    row.docLabel ||
    (row.docId === 'other'
      ? (row.docOther || 'سایر')
      : (docOptions.find(d => d.id === row.docId)?.label || 'پیش فاکتور'));

  const centerLabel = tabs.find(t => t.id === row.scope)?.label || '—';

  const actions = (row.actions || []).slice();
  const rowStatus = (row.status || '').toString().toLowerCase();
  const currentStepKeyRow = getCurrentStepKeyForRow(row);

  let actionsHtml = '';
  if (actions.length) {
    actionsHtml = actions.map((a, idx) => {
      let rawStatus =
        a.status ||
        a.action ||
        a.type ||
        a.kind ||
        '';

      let noteRaw = a.note || a.comment || a.reason || '';

      if ((!rawStatus || rawStatus === 'status') && typeof noteRaw === 'string') {
        const m = noteRaw.match(/status=([a-z_]+)/i);
        if (m) rawStatus = m[1];
      }

      let displayNote = noteRaw;
      if (
        typeof displayNote === 'string' &&
        /^status=(pending|approved|rejected|returned)$/i.test(displayNote.trim())
      ) {
        displayNote = '—';
      }

      const baseLabel = actionLabel(rawStatus);
      const actType = (a.action || a.type || '').toString().toLowerCase();

      let roleForDisplay = '';
      if (actType === 'create') {
        roleForDisplay =
          a.to_role ||
          a.by_role ||
          a.role ||
          a.from_role ||
          a.current_role ||
          '';
      } else if (actType === 'status') {
        const toKeyTmp = roleToStepKey(a.to_role || a.current_role || '');
        if (toKeyTmp === 'payment_done') {
          roleForDisplay =
            a.to_role ||
            a.current_role ||
            a.from_role ||
            a.by_role ||
            a.role ||
            '';
        } else {
          roleForDisplay =
            a.from_role ||
            a.by_role ||
            a.role ||
            a.current_role ||
            a.to_role ||
            '';
        }
      } else {
        roleForDisplay =
          a.by_role ||
          a.role ||
          a.from_role ||
          a.current_role ||
          a.to_role ||
          '';
      }

      let stepKey = roleToStepKey(roleForDisplay);
      if (!stepKey) stepKey = 'creator';
      const stepMeta = workflowStepMeta[stepKey] || workflowStepMeta.creator;

      let displayLabel = baseLabel;
      const isLast = idx === actions.length - 1;
      if (
        isLast &&
        rowStatus === 'approved' &&
        currentStepKeyRow === 'payment_done'
      ) {
        displayLabel = 'پرداخت';
      } else if (
        (rawStatus === 'approved' || baseLabel === 'تأیید') &&
        stepKey === 'payment_done'
      ) {
        displayLabel = 'پرداخت';
      }

      const at = a.at || a.created_at || a.time || a.timestamp || null;
      const atText = at ? `${fmtDateFa(at)} - ${fmtTimeFa(at)}` : '—';

      const isCreateAction =
        actType === 'create' ||
        rawStatus === 'created';

      let byText = '';
      if (isCreateAction) {
        byText = getActionUserName(row, a) || '—';
      } else {
        byText = stepMeta.label || '—';
      }

      return `
        <tr>
          <td>${displayLabel || '—'}</td>
          <td>${byText || '—'}</td>
          <td>${displayNote || '—'}</td>
          <td>${atText}</td>
        </tr>
      `;
    }).join('');
  }

  w.document.write(`
  <html lang="fa" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <title>درخواست پرداخت</title>

    <!-- فونت وزیرمتن برای چاپ -->
    <link rel="stylesheet" href="https://cdn.fontcdn.ir/Font/Persian/Vazirmatn/Vazirmatn.css" />

    <style>
      @page { size: A4; margin: 14mm; }
      * { box-sizing: border-box; }

      /* اعمال صریح فونت روی همه‌ی المان‌های مهم چاپ */
      body,
      table,
      th,
      td,
      div,
      span,
      p,
      h1, h2, h3, h4, h5, h6 {
        font-family: 'Vazirmatn', system-ui, -apple-system, 'Segoe UI', sans-serif;
      }

      html, body { margin: 0; padding: 0; direction: rtl; }
      body {
        background: #f3f4f6;
        color: #0f172a;
      }
      .wrap { max-width: 190mm; margin: 0 auto; padding: 10mm 0; }
      .card {
        background: #ffffff;
        border-radius: 16px;
        border: 1px solid #e5e7eb;
        padding: 18px 20px;
      }
      .row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .meta-row { font-size: 12px; }
      .center { text-align: center; }
      .mt-3 { margin-top: 12px; }
      .divider { height: 0; border-top: 1px solid #e5e7eb; margin: 12px 0; }
      .title-main { font-weight: 800; font-size: 13px; }
      .title-big { font-weight: 800; font-size: 15px; }
      .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

      .info-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 12px;
      }
      .info-table th,
      .info-table td {
        border: 1px solid #e5e7eb;
        padding: 6px 8px;
        text-align: right;
        vertical-align: top;
      }
      .info-head { background: #f9fafb; font-weight: 600; }
      .mono { direction: ltr; font-family: 'Vazirmatn', system-ui, -apple-system, 'Segoe UI', sans-serif; }

      .section-title { font-size: 12px; font-weight: 600; margin-bottom: 6px; }

      .actions-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 12px;
        margin-top: 6px;
      }
      .actions-table th,
      .actions-table td {
        border: 1px solid #e5e7eb;
        padding: 5px 7px;
        text-align: right;
      }
      .actions-head { background: #f9fafb; font-weight: 600; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <div class="row">
          <div style="display:flex;flex-direction:column;align-items:center;gap:6px;width:100%;">
            <img src="/images/light.png" alt="logo" style="height:48px;object-fit:contain;" />
            <div class="title-main">
              مدیریت یکپارچه فرآیندهای شرکت ایده پویان انرژی
            </div>
          </div>
        </div>

        <div class="mt-3 row meta-row">
          <div>
            <b>شماره درخواست:</b>
            <span class="mono">${row.serial || '—'}</span>
          </div>
          <div class="title-big center" style="flex:1;">درخواست پرداخت</div>
          <div style="text-align:left;">
            <b>تاریخ و ساعت:</b>
            <span>${createdDate} - ${createdTime}</span>
          </div>
        </div>

        <div class="divider"></div>

        <div class="grid2">
          <div>
            <div><span style="color:#6b7280;">درخواست کننده:</span> <b>${row.createdByName || '—'}</b></div>
            <div style="margin-top:4px;">
              <span style="color:#6b7280;">کد بودجه:</span>
              <span class="mono">${toEnDigits(_code || '—')}</span>
            </div>
          </div>
          <div>
            <div><span style="color:#6b7280;">مرکز بودجه:</span> <b>${centerLabel}</b></div>
          </div>
        </div>

        <div class="divider"></div>

        <div class="section-title">جزئیات کامل</div>
        <table class="info-table">
          <tbody>
            <!-- ردیف ۱: عنوان / شرح (شرح دو ستون) -->
            <tr>
              <td>
                <span style="color:#6b7280;">عنوان درخواست: </span>
                <span style="font-weight:500;">${row.title || '—'}</span>
              </td>
              <td colspan="2">
                <span style="color:#6b7280;">شرح: </span>
                <span>${row.desc || '—'}</span>
              </td>
            </tr>

            <!-- ردیف ۲: مبلغ درخواست / نام ذینفع / اطلاعات بانکی ذینفع (هر کدام یک ستون) -->
            <tr>
              <td>
                <span style="color:#6b7280;">مبلغ درخواست (${_currencyLabel}): </span>
                <span class="mono">${amountFormatted}</span>
              </td>
              <td>
                <span style="color:#6b7280;">نام ذینفع: </span>
                <span style="font-weight:500;">${row.beneficiaryName || '—'}</span>
              </td>
              <td>
                <span style="color:#6b7280;">اطلاعات بانکی ذینفع: </span>
                <span>${row.bankInfo || '—'}</span>
              </td>
            </tr>

            <!-- ردیف ۳: نقدی / اعتباری / تاریخ + شرح پرداخت اعتباری -->
            <tr>
              <td>
                <span style="color:#6b7280;">مبلغ نقدی (${_currencyLabel}): </span>
                <span class="mono">${cashFormatted}</span>
              </td>
              <td>
                <span style="color:#6b7280;">مانده اعتباری (${_currencyLabel}): </span>
                <span class="mono">${creditFormatted}</span>
              </td>
              <td>
                <div>
                  <span style="color:#6b7280;">تاریخ پرداخت: </span>
                  <span>${cashDateFa}</span>
                </div>
                <div style="margin-top:3px;">
                  <span style="color:#6b7280;">شرح پرداخت اعتباری: </span>
                  <span>${row.creditPay || '—'}</span>
                </div>
              </td>
            </tr>

            <!-- ردیف ۴: نوع سند / شماره سند / تاریخ سند -->
            <tr>
              <td>
                <span style="color:#6b7280;">نوع سند: </span>
                <span>${docTitle || '—'}</span>
              </td>
              <td>
                <span style="color:#6b7280;">شماره سند: </span>
                <span>${row.docNumber || '—'}</span>
              </td>
              <td>
                <span style="color:#6b7280;">تاریخ سند: </span>
                <span>${docDateFa}</span>
              </td>
            </tr>
          </tbody>
        </table>

        ${
          actionsHtml
            ? `
              <div class="mt-3">
                <div class="section-title">سوابق اقدام</div>
                <table class="actions-table">
                  <thead class="actions-head">
                    <tr>
                      <th style="width:22mm;">اقدام</th>
                      <th style="width:32mm;">توسط</th>
                      <th>شرح</th>
                      <th style="width:40mm;">تاریخ و ساعت</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${actionsHtml}
                  </tbody>
                </table>
              </div>
            `
            : ''
        }
      </div>
    </div>

    <script>
      (function () {
        function doPrint() {
          window.print();
          setTimeout(function () { window.close(); }, 300);
        }
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(doPrint);
        } else {
          window.onload = doPrint;
        }
      })();
    </script>
  </body>
  </html>
  `);

  w.document.close();
};






  const downloadPdfRow = (row) => {
    printRow(row);
  };

  const TopKindPicker = ({ reqErr, allowedTabs }) => {
        const tabList = (allowedTabs && allowedTabs.length) ? allowedTabs : tabs;
    const hasOptions = (sortedSourceItems || []).length > 0;
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-600 dark:text-white/60">مرکز بودجه</label>
          <select
            className="w-full border rounded-xl px-3 py-2 bg-white text-neutral-900 border-black/10
                       dark:border-white/15 dark:bg-white/5 dark:text-white"
            value={active}
            onChange={e => { setActive(e.target.value); setProjectId(''); setBudgetCode(''); setReqErr({}); }}
          >
            {tabList.map(t => (
              <option
                key={t.id}
                value={t.id}
                className="bg-white text-neutral-900 dark:bg-zinc-900 dark:text-white"
              >
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {active === 'projects' && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-600 dark:text-white/60">پروژه</label>
            <select
              className="w-full border rounded-xl px-3 py-2 ltr font-[inherit] bg-white text-neutral-900 border-black/10
                         dark:border-white/15 dark:bg-white/5 dark:text-white"
              value={projectId}
              onChange={e => { setProjectId(e.target.value); setBudgetCode(''); setReqErr(prev => ({ ...prev, projectId: '' })); }}
            >
              <option value="" className="bg-white text-neutral-900 dark:bg-zinc-900 dark:text-white">انتخاب کنید</option>
              {(sortedProjects || []).map(p => (
                <option key={p.id} value={p.id} className="bg-white text-neutral-900 dark:bg-zinc-900 dark:text-white">
                  {(p.code ? p.code : '—') + ' — ' + (p.name || '')}
                </option>
              ))}
            </select>
            {reqErr.projectId && (
              <div className="mt-1 text-xs text-red-600 dark:text-red-400">{reqErr.projectId}</div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-600 dark:text-white/60">کد بودجه</label>

          {hasOptions ? (
            <>
              <select
                className="w-full border rounded-xl px-3 py-2 ltr font-[inherit] bg-white text-neutral-900 border-black/10 disabled:opacity-50
                           dark:border-white/15 dark:bg-white/5 dark:text-white"
                value={budgetCode}
                onChange={e => {
                  const val = e.target.value;
                  setBudgetCode(val);
                  setReqErr(prev => ({ ...prev, budgetCode: '' }));
                  const found = (sortedSourceItems || []).find(it => it.code === val);
                  if (found) {
                    setTitleInput(found.name || '');
                  }
                }}
                disabled={active === 'projects' && !projectId}
              >
                <option value="" className="bg-white text-neutral-900 dark:bg-zinc-900 dark:text-white">انتخاب کنید</option>
                {(sortedSourceItems || []).map(it => (
                  <option key={it.code} value={it.code} className="bg-white text-neutral-900 dark:bg-zinc-900 dark:text-white">
                    {renderBudgetCodeOnce(it.code, active) + ' — ' + (it.name || '')}
                  </option>
                ))}
              </select>
              {reqErr.budgetCode && (
                <div className="mt-1 text-xs text-red-600 dark:text-red-400">{reqErr.budgetCode}</div>
              )}
            </>
          ) : (
            <>
              <input
                dir="ltr"
                className="w-full border rounded-xl px-3 py-2 ltr font-[inherit] bg-white text-neutral-900 placeholder-neutral-400 border-black/10
                           dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder-white/40"
                value={budgetCode}
                onChange={e => { setBudgetCode(e.target.value); setReqErr(prev => ({ ...prev, budgetCode: '' })); }}
                placeholder="کُد بودجه را وارد کنید…"
                disabled={active === 'projects' && !projectId}
              />
              {reqErr.budgetCode && (
                <div className="mt-1 text-xs text-red-600 dark:text-red-400">{reqErr.budgetCode}</div>
              )}
            </>
          )}
          {!hasOptions && (
            <div className="mt-1 text-[11px] text-neutral-500 dark:text-white/60">
              لیست کُدها در دسترس نیست؛ می‌توانید کُد را دستی وارد کنید.
            </div>
          )}
        </div>
      </div>
    );
  };

  const WorkflowTimelineStatic = ({ scope }) => {
    const steps = getWorkflowStepsForScope(scope);
    if (!steps.length) return null;
    return (
      <div className="flex flex-col gap-2 mt-3">
        <div className="text-xs text-neutral-700 dark:text-white/70 text-right">
          گردش کار فرآیند درخواست پرداخت
        </div>
        <div className="mt-1 w-full px-2 md:px-4" dir="ltr">
          <div className="relative flex items-center justify-between w-full">
            {/* خط خاکستری وسط دایره‌ها */}
            <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-[2px] bg-neutral-300 dark:bg-neutral-700" />
            {steps.map((st, idx) => (
              <div
                key={st.key + 'lbl' + idx}
                className="relative flex flex-col items-center flex-1 text-center"
              >
                <div
                  className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center shadow-sm z-[1] text-neutral-900 dark:text-neutral-900"
                  style={{
                    backgroundColor: st.color,
                    fontFamily: vazirFont,
                    fontSize: '13px',
                  }}
                >
                  {toFaDigits(st.key === 'creator' ? 0 : st.index)}
                </div>
                <div className="mt-1 text-[10px] md:text-[11px] text-neutral-700 dark:text-white/70">
                  {st.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const [actionText, setActionText] = React.useState('');
  const [actionBusy, setActionBusy] = React.useState(false);
  const [actionErr, setActionErr] = React.useState('');
  const [hasActionOnThisView, setHasActionOnThisView] = React.useState(false);

  React.useEffect(() => {
    setActionText('');
    setActionBusy(false);
    setActionErr('');
    setHasActionOnThisView(false);
  }, [viewItem && viewItem.id]);

    const recordAction = async (type, note) => {
    if (!viewItem || actionBusy || hasActionOnThisView) return;

    const viewId = viewItem.id;
    setActionBusy(true);
    setActionErr('');

    const statusForEndpoint =
      type === 'approved' ? 'approved' :
      type === 'rejected' ? 'rejected' :
      'returned';

    try {
      // ۱) ثبت اقدام روی سرور
      await api('/requests/status', {
        method: 'POST',
        body: JSON.stringify({ id: viewId, status: statusForEndpoint, note }),
      });

      // ۲) دوباره گرفتن کل لیست درخواست‌ها از سرور
      const resp = await api('/requests');
      const list = Array.isArray(resp?.items)
        ? resp.items
        : Array.isArray(resp?.requests)
          ? resp.requests
          : Array.isArray(resp)
            ? resp
            : [];

      const normalized = (list || []).map(normalizeRequestRow).filter(Boolean);

      // ۳) به‌روزرسانی state لوکال
      setItems(normalized);

      const fresh = normalized.find(x => String(x.id) === String(viewId)) || null;
      setViewItem(fresh); // اگر از این کاربر گرفته شده باشد، isRowForMe = false می‌شود و در Inbox هم نخواهد بود

      setHasActionOnThisView(true);
      setActionBusy(false);
      setActionText('');
    } catch (e) {
      setActionErr(e?.message || 'خطا در ثبت اقدام روی سرور.');
      setActionBusy(false);
    }
  };


  const approveCurrent  = (note) => recordAction('approved', note);
  const rejectCurrent   = (note) => recordAction('rejected', note);
  const returnCurrent   = (note) => recordAction('returned', note);

  const renderTable = (rows, emptyText='موردی ثبت نشده است.') => (
    <TableWrap>
      <div className="bg-white text-black rounded-2xl border border-black/10 overflow-hidden dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
        <table className="w-full text-sm [&_th]:text-center [&_td]:text-center" dir="rtl">
          <THead>
            <tr className="bg-black/5 text-black border-y border-black/10 dark:bg-white/5 dark:text-neutral-100 dark:border-neutral-700">
              <TH className="w-16 !text-center !font-semibold !text-black dark:!text-neutral-100">#</TH>
              <TH className="w-48 !text-center !font-semibold !text-black dark:!text-neutral-100">شماره</TH>
              <TH className="w-40 !text-center !font-semibold !text-black dark:!text-neutral-100">تاریخ</TH>
              <TH className="w-40 !text-center !font-semibold !text-black dark:!text-neutral-100">مرکز بودجه</TH>
              <TH className="!text-center !font-semibold !text-black dark:!text-neutral-100">عنوان درخواست</TH>
              <TH className="w-56 !text-center !font-semibold !text-black dark:!text-neutral-100">مبلغ درخواست (ریال)</TH>
              <TH className="w-48 !text-center !font-semibold !text-black dark:!text-neutral-100">آخرین وضعیت</TH>
              <TH className="w-56 !text-center !font-semibold !text-black dark:!text-neutral-100">اقدامات</TH>
            </tr>
          </THead>

          <tbody className="[&_td]:text-black dark:[&_td]:text-neutral-100">
            {(rows || []).length === 0 ? (
              <TR>
                <TD colSpan={8} className="text-center text-black/60 dark:text-neutral-400 py-6 bg-black/[0.02] dark:bg-transparent">
                  {emptyText}
                </TD>
              </TR>
            ) : rows.map((it, idx) => (
              <TR
                key={it.id}
                className="odd:bg-black/[0.02] even:bg-black/[0.04] hover:bg-black/[0.06] transition-colors
                           dark:odd:bg-white/5 dark:even:bg:white/10 dark:hover:bg:white/15 border-t border-black/10 dark:border-neutral-800"
              >
                <TD className="px-3 py-3 !text-center">
                  <span
                    className="text-[13px] md:text-[14px]"
                    style={{ fontFamily: vazirFont }}
                  >
                    {toFaDigits(idx + 1)}
                  </span>
                </TD>
                <TD className="px-3 py-3">
                  <div className="grid w-full place-items-center">
                    <span
                      dir="ltr"
                      className="text-[13px] md:text-[14px]"
                      style={{ fontFamily: vazirFont }}
                    >
                      {it.serial || '—'}
                    </span>
                  </div>
                </TD>
                <TD className="px-3 py-3 !text-center">{toFaDigits(it.dateFa || '')}</TD>
                <TD className="px-3 py-3 !text-center">{tabs.find(t => t.id === it.scope)?.label || '—'}</TD>
                <TD className="px-3 py-3 !text-center">{it.title || '—'}</TD>

                <TD className="px-3 py-3 !text-center">
                  <span
                    className="ltr text-[13px] md:text-[14px]"
                    style={{ fontFamily: vazirFont }}
                  >
                    {toFaDigits(formatMoney(it.amount || 0))}
                  </span>
                </TD>

                <TD className="px-3 py-3 !text-center">
                  {StatusPill(it)}
                </TD>

                <TD className="px-3 py-3 !text-center">
                  <div className="inline-flex items-center justify-center gap-2">
                    <button
                      type="button"
                      className="h-10 w-10 grid place-items-center rounded-xl border border-black/10 bg-white hover:bg-black/5
                                 dark:border-white/20 dark:bg-transparent dark:hover:bg:white/10"
                      onClick={() => setViewItem(it)}
                      title="نمایش"
                    >
                      <img src="/images/icons/namayesh.svg" alt="" className="w-5 h-5 dark:invert" />
                    </button>
                    <button
                      type="button"
                      className="h-10 w-10 grid place-items-center rounded-xl border border-black/10 bg-white hover:bg-black/5
                                 dark:border-white/20 dark:bg-transparent dark:hover:bg:white/10"
                      onClick={() => onEdit(it.id)}
                      title="ویرایش"
                      aria-label="ویرایش"
                    >
                      <img src="/images/icons/pencil.svg" alt="" className="w-5 h-5 dark:invert" />
                    </button>
                    <button
                      type="button"
                      className="h-10 w-10 grid place-items-center rounded-xl border border-red-500 hover:bg-neutral-200 transition dark:hover:bg-neutral-800"
                      onClick={() => delItem(it.id)}
                      title="حذف"
                    >
                      <img
                        src="/images/icons/hazf.svg"
                        alt=""
                        className="w-5 h-5"
                        style={{ filter: 'invert(22%) sepia(98%) saturate(7400%) hue-rotate(1deg) brightness(90%) contrast(120%)' }}
                      />
                    </button>
                  </div>
                </TD>
              </TR>
            ))}
          </tbody>
        </table>
      </div>
    </TableWrap>
  );

  const openCurrencyModal = async () => {
    setCurrencyModalOpen(true);
    if (currencyItems.length && currencySourceItems.length) return;
    setCurrencyLoading(true);
    setCurrencyErr('');
    try {
      const [typesResp, sourcesResp] = await Promise.all([
        currencyItems.length ? Promise.resolve(null) : api('/base/currencies/types'),
        currencySourceItems.length ? Promise.resolve(null) : api('/base/currencies/sources'),
      ]);
      if (typesResp) {
        const list = typesResp?.items || typesResp?.data || typesResp?.types || [];
        setCurrencyItems(list);
      }
      if (sourcesResp) {
        const listS = sourcesResp?.items || sourcesResp?.data || sourcesResp?.sources || [];
        setCurrencySourceItems(listS);
      }
    } catch (e) {
      setCurrencyErr(e?.message || 'خطا در دریافت لیست ارزها و منشأ ارز.');
    } finally {
      setCurrencyLoading(false);
    }
  };



  const applyCurrencySelection = () => {
  // پیدا کردن آیتمِ نوع ارز
  const typeItem = (currencyItems || []).find((it) => {
    const id = it.id ?? it.code ?? it.value ?? it.currency_id ?? it.key;
    return (
      selectedCurrencyId != null &&
      String(selectedCurrencyId) === String(id)
    );
  });

  // پیدا کردن آیتمِ منشا ارز
  const sourceItem = (currencySourceItems || []).find((it) => {
    const id = it.id ?? it.code ?? it.value ?? it.source_id ?? it.key;
    return (
      selectedCurrencySourceId != null &&
      String(selectedCurrencySourceId) === String(id)
    );
  });

  // اگر نوع ارز انتخاب شده بود، لیبلش رو روی state اصلی بنویس
  if (typeItem) {
    const label =
      typeItem.label ||
      typeItem.title ||
      typeItem.name ||
      typeItem.code ||
      typeItem.symbol ||
      'ریال';
    setCurrencyLabel(label);
  }

  // اگر منشا ارز انتخاب شده بود، لیبلش رو هم ست کن
  if (sourceItem) {
    const label =
      sourceItem.label ||
      sourceItem.title ||
      sourceItem.name ||
      sourceItem.code ||
      '';
    setCurrencySourceLabel(label);
  }

  // بستن پاپ‌آپ
  setCurrencyModalOpen(false);
};




    const UploadDocsSection = () => {
  const doneFiles   = docFiles.filter(f => f.status === 'done' && (f.serverId || f.url));
  const hasAnyFiles = docFiles.length > 0;

  return (
    <>
      {/* ردیف خلاصه در فرم اصلی (فیلد کوچک برای قرار گرفتن کنار تاریخ سند) */}
      <div className="mb-2">
        <div className="flex items-center justify-between gap-2 mb-1">
          <label className="text-xs text-neutral-600 dark:text-white/60">
            مستندات و فایل‌های پیوست
          </label>

          <button
            type="button"
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] border border-black/15 bg-white hover:bg-black/5
                       dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-neutral-100"
          >
            <span>مدیریت فایل‌ها</span>
          </button>
        </div>

        {/* متن راهنما نزدیک به فیلد */}
        <div className="text-[11px] text-neutral-500 dark:text-white/60">
          فقط تصویر و PDF تا حدود {toFaDigits(Math.round(MAX_DOC_SIZE / 1024))} کیلوبایت برای هر فایل
        </div>

        {/* خلاصه تعداد فایل‌ها؛ دقیقاً زیر همین فیلد */}
        <div className="mt-1 flex flex-wrap gap-2">
          {!hasAnyFiles && (
            <span className="text-[11px] text-neutral-500 dark:text-white/60">
              فایلی پیوست نشده است.
            </span>
          )}

          {doneFiles.length > 0 && (
            <span className="text-[11px] text-neutral-700 dark:text-white/70">
              {toFaDigits(doneFiles.length)} فایل ضمیمه شده
            </span>
          )}

          {docFiles.some(f => f.status === 'uploading' || f.status === 'optimizing') && (
            <span className="text-[11px] text-amber-600 dark:text-amber-300">
              تعدادی فایل در حال آماده‌سازی/آپلود هستند…
            </span>
          )}
        </div>
      </div>

      {/* مودال آپلود؛ کاملاً وسط صفحه و ریسپانسیو */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl mx-4 rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-xl
                          dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700">
            {/* هدر مودال */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 dark:border-neutral-700">
              <div className="text-sm font-semibold">
                مدیریت فایل‌های پیوست
              </div>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="h-8 w-8 grid place-items-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10"
                title="بستن"
              >
                <img
                  src="/images/icons/close.svg"
                  alt=""
                  className="w-5 h-5 invert dark:invert-0"
                />
              </button>
            </div>

            {/* بدنه مودال */}
            <div className="p-4 space-y-4">
              {/* ناحیه درگ & دراپ */}
              <div
                onDrop={handleDropFiles}
                onDragOver={handleDragOver}
                onClick={() => uploadInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-black/15 rounded-2xl px-4 py-5 text-center
                           bg-black/5 hover:bg-black/[0.08] transition-colors
                           dark:border-neutral-600 dark:bg-neutral-800/70 dark:hover:bg-neutral-700"
              >
                <div className="flex flex-col items-center gap-2">
                  {/* متن بالا */}
                  <div className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                    کلیک کنید تا فایل انتخاب شود
                  </div>

                  {/* آیکن زیر متن، با upload.svg */}
                  <img
                    src="/images/icons/upload.svg"
                    alt=""
                    className="w-8 h-8 dark:invert"
                  />

                  {/* توضیح ریز زیر آیکن */}
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    می‌توانید تصاویر یا فایل‌های PDF را انتخاب کنید یا اینجا بکشید و رها کنید{' '}
                    (حداکثر {toFaDigits(Math.round(MAX_DOC_SIZE / 1024))} کیلوبایت برای هر فایل)
                  </div>
                </div>

                <input
                  ref={uploadInputRef}
                  type="file"
                  multiple
                  onChange={handleUploadInputChange}
                  className="hidden"
                />
              </div>

              {/* جدول لیست فایل‌ها */}
              {docFiles.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-black/10 bg-white
                                dark:border-neutral-700 dark:bg-neutral-900/80">
                  <table className="w-full text-[12px] [&_th]:text-center [&_td]:text-center">
                    <thead className="bg-black/5 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                      <tr>
                        <th className="py-1.5 px-2 w-8">#</th>
                        <th className="py-1.5 px-2 w-16">فایل</th>
                        <th className="py-1.5 px-2">نام فایل</th>
                        <th className="py-1.5 px-2 w-24">حجم</th>
                        <th className="py-1.5 px-2 w-28">وضعیت</th>
                        <th className="py-1.5 px-2 w-20">حذف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {docFiles.map((f, idx) => {
                        const isImage =
                          f.type && typeof f.type === 'string'
                            ? f.type.startsWith('image/')
                            : false;
                        const thumbSrc =
                          isImage && (f.previewUrl || f.url) ? (f.previewUrl || f.url) : null;
                        const sizeKb = f.size ? Math.round(f.size / 1024) : 0;

                        return (
                          <tr
                            key={f.id}
                            className="border-t border-black/10 dark:border-neutral-700 odd:bg-black/[0.02] even:bg-black/[0.04]
                                       dark:odd:bg-neutral-900 dark:even:bg-neutral-800"
                          >
                            {/* شماره ردیف */}
                            <td className="py-1.5 px-2">
                              {toFaDigits(idx + 1)}
                            </td>

                            {/* پریویو کوچک */}
                            <td className="py-1.5 px-2">
                              {thumbSrc ? (
                                <img
                                  src={thumbSrc}
                                  alt=""
                                  className="w-8 h-8 rounded-lg object-cover mx-auto"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-lg bg-neutral-100 grid place-items-center mx-auto
                                                dark:bg-neutral-700">
                                  <img
                                    src="/images/icons/file.svg"
                                    alt=""
                                    className="w-4 h-4 dark:invert"
                                  />
                                </div>
                              )}
                            </td>

                            {/* نام فایل */}
                            <td className="py-1.5 px-2 text-right">
                              <span
                                className="truncate inline-block max-w-[200px]"
                                title={f.name}
                              >
                                {f.name}
                              </span>
                            </td>

                            {/* حجم */}
                            <td className="py-1.5 px-2">
                              {toFaDigits(sizeKb)} کیلوبایت
                            </td>

                            {/* وضعیت */}
                            <td className="py-1.5 px-2">
                              {f.status === 'optimizing' && 'در حال آماده‌سازی'}
                              {f.status === 'uploading' &&
                                `در حال آپلود (${toFaDigits(f.progress || 0)}٪)`}
                              {f.status === 'done' && 'آپلود شده'}
                              {f.status === 'error' && (
                                <span className="text-red-600 dark:text-red-400">
                                  خطا: {f.error || 'نامشخص'}
                                </span>
                              )}
                            </td>

                            {/* حذف */}
                            <td className="py-1.5 px-2">
                              <button
                                type="button"
                                onClick={() => removeDocFile(f.id)}
                                className="h-8 w-8 grid place-items-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10"
                              >
                                <img
                                  src="/images/icons/hazf.svg"
                                  alt=""
                                  className="w-4 h-4"
                                  style={{
                                    filter:
                                      'invert(22%) sepia(98%) saturate(7400%) hue-rotate(1deg) brightness(90%) contrast(120%)',
                                  }}
                                />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};





  // استایل انیمیشن خط نارنجی تایم‌لاین + تپش دایره بعدی
  const AnimatedLineStyles = () => (
    <style>
      {`
        @keyframes prLineFlow {
          0% { background-position: 0% 0; }
          100% { background-position: 200% 0; }
        }
        .pr-animated-line {
          background-image: linear-gradient(90deg, transparent 0%, #f48224 50%, transparent 100%);
          background-size: 200% 100%;
          animation: prLineFlow 1.1s linear infinite;
        }
        @keyframes prDotPulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(244,130,36,0.65);
          }
          70% {
            transform: scale(1.08);
            box-shadow: 0 0 0 10px rgba(244,130,36,0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(244,130,36,0);
          }
        }
        .pr-dot-pulse {
          animation: prDotPulse 1.2s ease-out infinite;
        }
      `}
    </style>
  );

return (
  <>
    <AnimatedLineStyles />
    <Card className="rounded-2xl border bg-white text-neutral-900 border-black/10 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
      <div className="mb-4 text-base md:text-lg">
        <span className="text-neutral-700 dark:text-white/70">درخواست‌ها</span>
        <span className="mx-2 text-neutral-500 dark:text-white/60">›</span>
        <span className="font-semibold text-neutral-900 dark:text-white">
          درخواست پرداخت
        </span>
      </div>

      <div
        className={`mb-3 flex items-center gap-2 ${
          showForm ? "justify-end" : "justify-between"
        }`}
      >
        {!showForm && (
          <div className="flex items-center gap-2" dir="rtl">
            <button
              onClick={() => setFilterScope("")}
              className={`px-3 py-1.5 rounded-xl text-sm border ${
                filterScope === ""
                  ? "bg-neutral-900 text-white border-neutral-900"
                  : "bg-black/5 text-neutral-900 border-black/10 hover:bg-black/10 dark:bg-white/5 dark:text-white dark:border-white/15 dark:hover:bg-white/10"
              }`}
            >
              همه
            </button>

            {allowedCenterTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setFilterScope(t.id)}
                className={`px-3 py-1.5 rounded-xl text-sm border ${
                  filterScope === t.id
                    ? "bg-neutral-900 text-white border-neutral-900"
                    : "bg-black/5 text-neutral-900 border-black/10 hover:bg-black/10 dark:bg-white/5 dark:text-white dark:border-white/15 dark:hover:bg-white/10"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setShowForm((v) => !v);
            setReqErr({});
            setErr("");
          }}
          className="h-10 w-10 grid place-items-center rounded-xl border text-neutral-800 border-black/10 bg-white hover:bg-black/5 transition
                     dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
          aria-expanded={showForm}
          aria-label={showForm ? "نمایش لیست درخواست‌ها" : "درخواست پرداخت جدید"}
          title={showForm ? "نمایش لیست درخواست‌ها" : "درخواست پرداخت جدید"}
        >
          {showForm ? (
            <img
              src="/images/icons/listdarkhast.svg"
              alt=""
              className="w-5 h-5 dark:invert"
            />
          ) : (
            <img
              src="/images/icons/afzodan.svg"
              alt=""
              className="w-5 h-5 dark:invert"
            />
          )}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div className="mb-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-600 dark:text-white/60">
                شماره درخواست
              </label>
              <div
                className="px-3 py-2 rounded-xl bg-white text-neutral-900 border border-black/10 ltr
                            dark:bg-white/5 dark:text-white dark:border-white/10"
                style={{ fontFamily: vazirFont }}
              >
                {previewSerial}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-600 dark:text-white/60">
                تاریخ
              </label>
              <div className="px-3 py-2 rounded-xl bg-white text-neutral-900 border border-black/10
                              dark:bg-white/5 dark:text-white/90 dark:border-white/10">
                {todayFa}
              </div>
            </div>
          </div>

          <div className="mb-2">
            <TopKindPicker reqErr={reqErr} allowedTabs={allowedCenterTabs} />
            <WorkflowTimelineStatic scope={active} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-xs text-neutral-600 dark:text-white/60">
                عنوان درخواست
              </label>
              <input
                className="w-full border rounded-xl px-3 py-2 bg-white text-neutral-900 placeholder-neutral-400 border-black/10
                           dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:border-white/15"
                value={titleInput}
                onChange={(e) => {
                  setTitleInput(e.target.value);
                  setReqErr((prev) => ({ ...prev, title: "" }));
                }}
                placeholder=""
              />
              {reqErr.title && (
                <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {reqErr.title}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-xs text-neutral-600 dark:text-white/60">
                شرح
              </label>
              <textarea
                className="w-full border rounded-xl px-3 py-2 bg-white text-neutral-900 placeholder-neutral-400 border-black/10
                           dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:border-white/15"
                rows={3}
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                placeholder=""
              />
            </div>
          </div>

          <div className="mb-4">


  {docId === 'other' ? (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-start">
      {/* نوع سند */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-neutral-600 dark:text-white/60">نوع سند</label>
        <select
          className="w-full border rounded-xl px-3 py-2 text-sm bg-white text-neutral-900 border-black/10 dark:border-white/15 dark:bg-white/5 dark:text-white"
          value={docId}
          onChange={e => {
            setDocId(e.target.value);
            setReqErr(prev => ({ ...prev, docOther: '', docNumber: '', docDate: '' }));
          }}
        >
          {docOptions.map(opt => (
            <option
              key={opt.id}
              value={opt.id}
              className="bg-white text-neutral-900 dark:bg-zinc-900 dark:text-white"
            >
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* شماره سند */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-neutral-600 dark:text-white/60">شماره سند</label>
        <input
          className="w-full border rounded-xl px-3 py-2 text-sm bg-white text-neutral-900 placeholder-neutral-400 border-black/10
                 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:border-white/15"
          value={docNumber}
          onChange={e => {
            setDocNumber(toFaDigits(e.target.value));
            setReqErr(prev => ({ ...prev, docNumber: '' }));
          }}
          placeholder=""
        />
        {reqErr.docNumber && (
          <div className="mt-1 text-xs text-red-600 dark:text-red-400">{reqErr.docNumber}</div>
        )}
      </div>

      {/* تاریخ سند */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-neutral-600 dark:text-white/60">تاریخ سند</label>
        <button
          type="button"
          onClick={() => {
            setReqErr(prev => ({ ...prev, docDate: '' }));
            openPicker('doc');
          }}
          className={
            `w-full text-right px-3 py-2 rounded-xl border bg-white border-black/10 hover:bg-black/5 transition
         dark:bg-white dark:border-white/15 dark:hover:bg-black/5 ` +
            (docDate
              ? 'text-neutral-900 dark:text-neutral-900'
              : 'text-neutral-700 dark:text-white')
          }
        >
          {docDate ? toFaDigits(docDate) : 'انتخاب تاریخ…'}
        </button>

        {reqErr.docDate && (
          <div className="mt-1 text-xs text-red-600 dark:text-red-400">{reqErr.docDate}</div>
        )}
      </div>

      {/* آپلود سند + آپلود فایل‌ها */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-neutral-600 dark:text-white/60">آپلود سند</label>
        <input
          className="w-full border rounded-xl px-3 py-2 text-sm bg-white text-neutral-900 placeholder-neutral-400 border-black/10
                 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:border-white/15"
          value={docOther}
          onChange={e => {
            setDocOther(e.target.value);
            setReqErr(prev => ({ ...prev, docOther: '' }));
          }}
          placeholder="عنوان دلخواه…"
        />
        {reqErr.docOther && (
          <div className="mt-1 text-xs text-red-600 dark:text-red-400">{reqErr.docOther}</div>
        )}

        <button
          type="button"
          onClick={() => setUploadModalOpen(true)}
          className="mt-1 inline-flex w-full justify-center items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm
                     text-neutral-800 hover:bg-black/5 transition
                     dark:bg-white/5 dark:text-white dark:border-white/15 dark:hover:bg:white/10"
        >
          <img
            src="/images/icons/upload.svg"
            alt=""
            className="w-4 h-4 dark:invert"
          />
          <span>آپلود و الصاق فایل‌ها</span>
        </button>

        {docFiles.length > 0 && (
          <div className="text-[11px] text-neutral-500 dark:text-white/60">
            {toFaDigits(docFiles.length)} فایل ضمیمه شده
          </div>
        )}
      </div>
    </div>
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-start">
      {/* نوع سند */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-neutral-600 dark:text-white/60">نوع سند</label>
        <select
          className="w-full border rounded-xl px-3 py-2 text-sm bg-white text-neutral-900 border-black/10 dark:border-white/15 dark:bg-white/5 dark:text-white"
          value={docId}
          onChange={e => {
            setDocId(e.target.value);
            setReqErr(prev => ({ ...prev, docOther: '', docNumber: '', docDate: '' }));
          }}
        >
          {docOptions.map(opt => (
            <option
              key={opt.id}
              value={opt.id}
              className="bg-white text-neutral-900 dark:bg-zinc-900 dark:text-white"
            >
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* شماره سند */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-neutral-600 dark:text-white/60">شماره سند</label>
        <input
          className="w-full border rounded-xl px-3 py-2 text-sm bg-white text-neutral-900 placeholder-neutral-400 border-black/10
                 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:border-white/15"
          value={docNumber}
          onChange={e => {
            setDocNumber(toFaDigits(e.target.value));
            setReqErr(prev => ({ ...prev, docNumber: '' }));
          }}
          placeholder=""
        />
        {reqErr.docNumber && (
          <div className="mt-1 text-xs text-red-600 dark:text-red-400">{reqErr.docNumber}</div>
        )}
      </div>

      {/* تاریخ سند */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-neutral-600 dark:text-white/60">تاریخ سند</label>
        <button
          type="button"
          onClick={() => {
            setReqErr(prev => ({ ...prev, docDate: '' }));
            openPicker('doc');
          }}
          className={
            `w-full text-right px-3 py-2 rounded-xl border bg-white border-black/10 hover:bg-black/5 transition
         dark:bg-white dark:border-white/15 dark:hover:bg-black/5 ` +
            (docDate
              ? 'text-neutral-900 dark:text-neutral-900'
              : 'text-neutral-700 dark:text-white')
          }
        >
          {docDate ? toFaDigits(docDate) : 'انتخاب تاریخ…'}
        </button>

        {reqErr.docDate && (
          <div className="mt-1 text-xs text-red-600 dark:text-red-400">{reqErr.docDate}</div>
        )}
      </div>

      {/* آپلود درخواست + تعداد فایل */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-neutral-600 dark:text-white/60">آپلود درخواست</label>

        <button
          type="button"
          onClick={() => setUploadModalOpen(true)}
          className="inline-flex w-full justify-center items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm
                     text-neutral-800 hover:bg-black/5 transition
                     dark:bg-white/5 dark:text-white dark:border-white/15 dark:hover:bg:white/10"
        >
          <img
            src="/images/icons/upload.svg"
            alt=""
            className="w-4 h-4 dark:invert"
          />
          <span>آپلود و الصاق فایل‌ها</span>
        </button>

        {docFiles.length > 0 && (
          <div className="text-[11px] text-neutral-500 dark:text-white/60">
            {toFaDigits(docFiles.length)} فایل ضمیمه شده
          </div>
        )}
      </div>
    </div>
  )}
</div>




            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-600 dark:text-white/60">مبلغ درخواست ({currencyLabel})</label>
                <div className="relative">
                  <input
                    dir="ltr"
                    className={`w-full rounded-xl py-2 pr-3 pl-10 bg-white text-neutral-900 placeholder-neutral-400 border ${
                      amountTooHigh ? 'border-red-500 focus:border-red-500' : 'border-black/10'
                    } dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700`}
                    value={toFaDigits(amountStr)}
                    onChange={e => {
                      const n = parseMoney(e.target.value);
                      setAmountStr(formatMoney(n));
                      setReqErr(prev => ({ ...prev, amount: '' }));
                    }}
                    inputMode="numeric"
                    placeholder="۰"
                    style={{ fontFamily: vazirFont }}
                  />
                  <button
                    type="button"
                    onClick={openCurrencyModal}
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full border border-black/10 bg-white grid place-items-center hover:bg-black/5
                               dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                  >
                    <img src="/images/icons/arz.svg" alt="" className="w-4 h-4 dark:invert" />
                  </button>
                </div>
                {reqErr.amount && (
                  <div className="mt-1 text-xs text-red-600 dark:text-red-400">{reqErr.amount}</div>
                )}
                {amountTooHigh && (
                  <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                    مبلغ وارد شده از سقف باقی‌مانده بیشتر است.
                  </div>
                )}
                {!!budgetCode && (
                  <div className="text-xs text-neutral-600 dark:text-white/60 mt-1">
                    سقف بر اساس تخصیص این کُد:{' '}
                    <span className="ltr" style={{ fontFamily: vazirFont }}>{toFaDigits(formatMoney(availableForSelected))}</span> {currencyLabel}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-600 dark:text-white/60">نقدی ({currencyLabel})</label>
                <input
                  dir="ltr"
                  className={`w-full border rounded-xl px-3 py-2 placeholder-neutral-400 ${secondaryDisabled
                    ? 'bg-black/5 text-neutral-500 border-black/10 dark:bg-white/5 dark:text-white/50 dark:border-white/10'
                    : 'bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15'
                  }`}
                  value={toFaDigits(cashText)}
                  onChange={e => {
                    const n = parseMoney(e.target.value);
                    setCashText(formatMoney(n));
                    setReqErr(prev => ({ ...prev, cash: '' }));
                  }}
                  inputMode="numeric"
                  placeholder="۰"
                  style={{ fontFamily: vazirFont }}
                  disabled={secondaryDisabled}
                />
                {reqErr.cash && (
                  <div className="mt-1 text-xs text-red-600 dark:text-red-400">{reqErr.cash}</div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-600 dark:text-white/60">تاریخ پرداخت</label>
                <button
                  type="button"
                  onClick={() => { setReqErr(prev => ({ ...prev, cashDate: '' })); openPicker('cash'); }}
                  className={
                    `w-full text-right px-3 py-2 rounded-xl border bg-white border-black/10 hover:bg-black/5 transition
                     dark:bg-white dark:border-white/15 dark:hover:bg-black/5 ` +
                    (cashDate
                      ? 'text-neutral-900 dark:text-neutral-900'
                      : 'text-neutral-700 dark:text-white')
                  }
                >
                  {cashDate ? toFaDigits(cashDate) : 'انتخاب تاریخ…'}
                </button>

                {reqErr.cashDate && (
                  <div className="mt-1 text-xs text-red-600 dark:text-red-400">{reqErr.cashDate}</div>
                )}

                {pickerOpen && (
                  <div className="relative">
                    <div className="absolute z-[80] mt-2 w-[min(24rem,95vw)] right-0 bg-white text-neutral-900 border border-black/10 rounded-2xl shadow-xl p-4
             dark:bg-[#0f1117] dark:text-white dark:border-white/15"
                      onMouseDown={(e)=> e.stopPropagation()}
                      onClick={(e)=> e.stopPropagation()}
                    >
                      <div className="text-sm font-semibold mb-3 text-neutral-800 dark:text-white/80">انتخاب تاریخ</div>

                      <div className="grid grid-cols-3 gap-2 mb-3" dir="ltr">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-neutral-600 dark:text-white/60">سال</label>
                          <select
                            className="border rounded-xl px-2 py-2 bg-white text-neutral-900 border-black/10 dark:border-white/15 dark:bg-white/5 dark:text-white"
                            value={jYear}
                            onChange={e => {
                              const ny = parseInt(e.target.value,10);
                              setJYear(ny);
                              setJDay(d => Math.min(d, daysInJMonth(ny, jMonth)));
                            }}
                          >
                            {jYears.map(y => <option key={y} value={y} className="bg-white text-neutral-900 dark:bg-zinc-900 dark:text-white">{toFaDigits(y)}</option>)}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-neutral-600 dark:text-white/60">ماه</label>
                          <select
                            className="border rounded-xl px-2 py-2 bg-white text-neutral-900 border-black/10 dark:border-white/15 dark:bg-white/5 dark:text-white"
                            value={jMonth}
                            onChange={e => {
                              const nm = parseInt(e.target.value,10);
                              setJMonth(nm);
                              setJDay(d => Math.min(d, daysInJMonth(jYear, nm)));
                            }}
                          >
                            {monthsFa.map((m, i) => <option key={i+1} value={i+1} className="bg-white text-neutral-900 dark:bg-zinc-900 dark:text-white">{m}</option>)}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-neutral-600 dark:text-white/60">روز</label>
                          <select
                            className="border rounded-xl px-2 py-2 bg-white text-neutral-900 border-black/10 dark:border-white/15 dark:bg-white/5 dark:text-white"
                            value={jDay}
                            onChange={e => setJDay(parseInt(e.target.value,10))}
                          >
                            {Array.from({ length: daysInJMonth(jYear, jMonth) }).map((_, i) => (
                              <option key={i+1} value={i+1} className="bg-white text-neutral-900 dark:bg-zinc-900 dark:text-white">{toFaDigits(i+1)}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-neutral-700 dark:text-white/80">
                          پیش‌نمایش:{' '}
                          <span className="ltr" style={{ fontFamily: vazirFont }}>
                            {toFaDigits(`${jYear}/${String(jMonth).padStart(2,'0')}/${String(jDay).padStart(2,'0')}`)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={clearPick}
                            className="px-4 py-2 rounded-xl border border-black/10 text-neutral-800 hover:bg-black/5 dark:border-white/15 dark:text-white dark:hover:bg:white/10"
                            type="button"
                          >
                            بستن
                          </button>
                          <button
                            onClick={confirmPick}
                            className="px-5 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-zinc-900"
                            type="button"
                          >
                            تأیید
                          </button>
                        </div>
                      </div>

                      {pickerErr && <div className="mt-3 text-xs text-red-600 dark:text-red-400">{pickerErr}</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-600 dark:text-white/60">مانده اعتباری ({currencyLabel})</label>
                <div
                  className={`px-3 py-2 rounded-xl border border-black/10 ltr
                                ${secondaryDisabled
                    ? 'bg-black/5 text-neutral-500 dark:bg-white/5 dark:text-white/50 dark:border-white/10'
                    : 'bg-white text-neutral-900 dark:bg-white/5 dark:text-white dark:border-white/10'
                  }`}
                  style={{ fontFamily: vazirFont }}
                >
                  {toFaDigits(creditSection || '0')}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-600 dark:text-white/60">شرح پرداخت اعتباری</label>
                <input
                  className={`w-full border rounded-xl px-3 py-2 text-sm placeholder-neutral-400 ${
                    creditIsZero || secondaryDisabled
                      ? 'bg-black/5 text-neutral-500 border-black/10 dark:bg-white/5 dark:text-white/50 dark:border-white/10'
                      : 'bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15'
                  }`}
                  value={creditIsZero ? '-' : creditPay}
                  onChange={e => { if (!creditIsZero && !secondaryDisabled) { setCreditPay(e.target.value); setReqErr(prev => ({ ...prev, creditPay: '' })); } }}
                  placeholder=""
                  disabled={creditIsZero || secondaryDisabled}
                  readOnly={creditIsZero || secondaryDisabled}
                />
                {reqErr.creditPay && (
                  <div className="mt-1 text-xs text-red-600 dark:text-red-400">{reqErr.creditPay}</div>
                )}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-600 dark:text-white/60">نام ذینفع</label>
                <input
                  className="w-full border rounded-xl px-3 py-2 mt-1 bg-white text-neutral-900 placeholder-neutral-400 border-black/10
                             dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:border-white/15"
                  value={beneficiaryName}
                  onChange={e => { setBeneficiaryName(e.target.value); setReqErr(prev => ({ ...prev, beneficiaryName: '' })); }}
                  placeholder="نام ذینفع را وارد کنید…"
                />
                {reqErr.beneficiaryName && (
                  <div className="mt-1 text-xs text-red-600 dark:text-red-400">{reqErr.beneficiaryName}</div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-600 dark:text-white/60">اطلاعات بانکی ذینفع</label>
                <input
                  className="w-full border rounded-xl px-3 py-2 mt-1 bg-white text-neutral-900 placeholder-neutral-400 border-black/10
                             dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:border-white/15"
                  value={bankInfo}
                  onChange={e => { setBankInfo(toFaDigits(e.target.value)); setReqErr(prev => ({ ...prev, bankInfo: '' })); }}
                  placeholder="نام بانک، شماره شبا/کارت، صاحب حساب و ..."
                />
                {reqErr.bankInfo && (
                  <div className="mt-1 text-xs text-red-600 dark:text-red-400">{reqErr.bankInfo}</div>
                )}
              </div>
            </div>

            {err && <div className="text-sm text-red-600 dark:text-red-400 mt-3">{err}</div>}

            <div className="mt-4 flex items-center gap-2 justify-end">
              <button
                type="submit"
                className="h-10 w-12 rounded-xl bg-neutral-900 text-white grid place-items-center disabled:opacity-50 dark:bg-white dark:text-zinc-900"
                disabled={parseMoney(amountStr) <= 0 || (active === 'projects' && !projectId)}
                title="ثبت"
              >
                <img src="/images/icons/sabtdarkhast.svg" alt="" className="w-5 h-5 invert dark:invert-0" />
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-neutral-800 dark:text-white/80">
              درخواست‌های من ({mineItems.length})
            </div>
            {renderTable(mineItems, 'موردی برای شما ثبت نشده است.')}
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold text-neutral-800 dark:text-white/80">
              درخواست‌هایی که برای من آمده ({inboxItems.length})
            </div>
            {renderTable(inboxItems, 'موردی در این بخش نیست.')}
          </div>
        </div>

        {openInfo && (
          <div
            className="fixed z-[180] w-56 bg-white text-neutral-900 border border-black/10 rounded-xl shadow-xl p-3 text-[12px] dark:bg-[#0f1117] dark:text-white dark:border-white/15"
            style={{ top: openInfo.top, right: openInfo.right }}
            onMouseDown={(e)=> e.stopPropagation()}
            onClick={(e)=> e.stopPropagation()}
          >
            {(() => {
              const row = (items || []).find(x => x.id === openInfo.id);
              if (!row) return null;
              return (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-neutral-700 dark:text-white/70">نقدی ({row.currencyLabel || 'ریال'})</span>
                    <span className="ltr" style={{ fontFamily: vazirFont }}>{row.cashText ? toFaDigits(row.cashText) : '۰'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-700 dark:text-white/70">مانده اعتباری ({row.currencyLabel || 'ریال'})</span>
                    <span className="ltr" style={{ fontFamily: vazirFont }}>{row.creditSection ? toFaDigits(row.creditSection) : '۰'}</span>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {viewItem && (
          <Portal>
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-start justify-center overflow-y-auto pt-16 md:pt-20 pb-10 px-4 md:px-8"
              onClick={()=> setViewItem(null)}
            >
              <div
                className="bg-white text-neutral-900 rounded-2xl p-5 w-[min(96vw,980px)] max-h-[85vh] overflow-auto ring-1 ring-black/10 dark:bg-[#0f1117] dark:text-white dark:ring-white/10"
                onClick={(e)=> e.stopPropagation()}
              >
                <ModalView row={viewItem} />

                {canTakeActionsFor(viewItem) && !hasActionOnThisView && (
                  <div className="mt-4 rounded-2xl p-3 border border-neutral-200 bg-white dark:bg-transparent dark:border-white/15">
                    <div className="mb-2 font-medium text-[13px]">اقدامات</div>
                    <div className="flex items-center gap-2" dir="rtl">
                      <label className="text-xs text-neutral-600 dark:text-white/60 shrink-0">شرح</label>
                      <input
                        value={actionText}
                        onChange={e=>setActionText(e.target.value)}
                        placeholder="شرح اقدام…"
                        className="flex-1 h-9 rounded-xl px-3 text-[13px] bg-white text-neutral-900 placeholder-neutral-400
                                   border border-neutral-300 outline-none focus:ring-2 focus:ring-neutral-300
                                   dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                      />
                      <button
                        title="تأیید"
                        onClick={()=>{ approveCurrent(actionText); setActionText(''); }}
                        disabled={actionBusy || hasActionOnThisView}
                        className="h-10 w-10 rounded-xl grid place-items-center bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <img src="/images/icons/taeid.svg" alt="" className="w-5 h-5 invert dark:invert-0" />
                      </button>
                      <button
                        title="رد"
                        onClick={()=>{ rejectCurrent(actionText); setActionText(''); }}
                        disabled={actionBusy || hasActionOnThisView}
                        className="h-10 w-10 rounded-xl grid place-items-center bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <img src="/images/icons/raddarkhast.svg" alt="" className="w-5 h-5 invert dark:invert-0" />
                      </button>
                      <button
                        title="برگشت"
                        onClick={()=>{ returnCurrent(actionText); setActionText(''); }}
                        disabled={actionBusy || hasActionOnThisView}
                        className="h-10 w-10 rounded-xl grid place-items-center border border-black/10 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <img src="/images/icons/bargashtdarkhast.svg" alt="" className="w-5 h-5 dark:invert" />
                      </button>
                    </div>
                    {actionErr && (
                      <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                        {actionErr}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => printRow(viewItem)}
                      className="h-10 w-10 grid place-items-center rounded-2xl border border-neutral-300 hover:bg-neutral-100 dark:border-white/20 dark:hover:bg:white/10"
                      title="چاپ این ردیف" aria-label="چاپ این ردیف"
                    >
                      <img src="/images/icons/print.svg" alt="" className="w-5 h-5 dark:invert" />
                    </button>
                    <button
                      onClick={() => downloadPdfRow(viewItem)}
                      className="h-10 w-10 grid place-items-center rounded-2xl border border-neutral-300 hover:bg-neutral-100 dark:border-white/20 dark:hover:bg:white/10"
                      title="دانلود PDF" aria-label="دانلود PDF"
                    >
                      <span
                        className="text-[11px] font-semibold"
                        style={{ fontFamily: vazirFont }}
                      >
                        PDF
                      </span>
                    </button>
                  </div>

                  <button
                    onClick={() => setViewItem(null)}
                    className="h-10 w-10 grid place-items-center rounded-2xl border border-neutral-900 bg-neutral-900 hover:bg-neutral-800 dark:border-white dark:bg-white dark:hover:bg-neutral-200"
                    title="بستن" aria-label="بستن"
                  >
                    <img
                      src="/images/icons/bastan.svg"
                      alt=""
                      className="w-5 h-5 invert dark:invert-0"
                    />
                  </button>
                </div>
              </div>
            </div>
          </Portal>
        )}



              {/* پاپ‌آپ آپلود و الصاق فایل‌ها */}
    {uploadModalOpen && (
  <Portal>
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => setUploadModalOpen(false)}
    >
      <div
        className="w-full max-w-2xl mx-4 rounded-2xl bg-white text-neutral-900 border border-black/10 shadow-xl
                         dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* هدر */}
        <div className="flex items-start justify-between gap-2 px-5 pt-5 pb-3">
          <div>
            <div className="text-sm font-semibold">
              آپلود و الصاق فایل‌ها
            </div>
            <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              تصویر یا PDF مربوط به این درخواست را بارگذاری کنید.
            </div>
          </div>
          {/* دکمه دایره‌ای بستن حذف شد */}
        </div>

        {/* باکس Drag & Drop */}
        <div className="px-5 pb-5">
          <div
            className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-center
                             dark:border-neutral-700 dark:bg-neutral-800/70"
            onDragOver={handleDragOver}
            onDrop={handleDropFiles}
          >
            <input
              ref={uploadInputRef}
              type="file"
              multiple
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleUploadInputChange}
            />

            <div className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-2xl bg-white shadow-sm grid place-items-center
                                     dark:bg-neutral-900">
                <img
                  src="/images/icons/upload.svg"
                  alt=""
                  className="w-6 h-6 dark:invert"
                />
              </div>

              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="text-sm font-medium text-neutral-900 underline underline-offset-4
                                 hover:text-neutral-700 dark:text-white"
              >
                کلیک کنید تا فایل انتخاب شود
              </button>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                یا فایل‌ها را اینجا رها کنید (حداکثر 400 کیلوبایت برای هر فایل)
              </div>
            </div>
          </div>

          {/* لیست فایل‌ها با Progress */}
          <div className="mt-4 space-y-3">
            {docFiles.length === 0 && (
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                هنوز فایلی اضافه نشده است.
              </div>
            )}

            {docFiles.map((f) => {
              const statusText =
                f.status === 'optimizing'
                  ? 'در حال آماده‌سازی…'
                  : f.status === 'uploading'
                  ? 'در حال آپلود…'
                  : f.status === 'done'
                  ? 'آپلود شد'
                  : f.status === 'error'
                  ? (f.error || 'خطا در آپلود')
                  : '';

              const progress =
                f.status === 'done'
                  ? 100
                  : f.progress || (f.status === 'error' ? 0 : 5);

              const percentDisplay = Math.round(progress);
              const sizeMb = f.size ? f.size / (1024 * 1024) : 0;

              return (
                <div
                  key={f.id}
                  className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-3 py-2.5
                                   dark:border-neutral-700 dark:bg-neutral-800"
                >
                  {/* آیکن / پریویو فایل */}
                  <div className="h-9 w-9 rounded-xl bg-neutral-100 grid place-items-center
                                        dark:bg-neutral-700 overflow-hidden">
                    {f.previewUrl && f.type && f.type.startsWith('image/') ? (
                      <img
                        src={f.previewUrl}
                        alt={f.name}
                        className="h-8 w-8 rounded-lg object-cover"
                      />
                    ) : (
                      <img
                        src="/images/icons/file.svg"
                        alt=""
                        className="w-4 h-4 dark:invert"
                      />
                    )}
                  </div>

                  {/* نام، سایز، نوار پیشرفت، درصد و بستن */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">
                          {f.name}
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          {toFaDigits(sizeMb.toFixed(1))} MB
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-[11px] text-neutral-600 dark:text-neutral-300">
                          {toFaDigits(percentDisplay)}%
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDocFile(f.id)}
                          className="h-8 w-8 grid place-items-center"
                          title="حذف فایل"
                        >
                          <img
                            src="/images/icons/bastan.svg"
                            alt="حذف"
                            className="w-3 h-3"
                          />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 h-1.5 rounded-full bg-neutral-200 overflow-hidden dark:bg-neutral-700">
                      <div
                        className={
                          'h-full rounded-full transition-all ' +
                          (f.status === 'error'
                            ? 'bg-red-500'
                            : f.status === 'done'
                            ? 'bg-emerald-500'
                            : 'bg-neutral-900 dark:bg-white')
                        }
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                      {statusText}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

         {/* فوتر مودال */}
<div className="mt-5 flex items-center justify-between">
  <button
    type="button"
    onClick={() => setUploadModalOpen(false)}
    className="h-9 px-4 rounded-xl border border-neutral-300 text-xs text-neutral-700 hover:bg-neutral-100
                 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800"
  >
    لغو
  </button>

  <button
    type="button"
    onClick={() => setUploadModalOpen(false)}
    disabled={!docFiles.some((f) => f.status === 'done')}
    className="h-9 px-4 rounded-xl bg-neutral-900 text-xs text-white disabled:opacity-40
                 flex items-center justify-center
                 dark:bg-white dark:text-neutral-900"
  >
    <img
      src="/images/icons/check.svg"
      alt="الصاق فایل‌ها"
      className="w-4 h-4 invert dark:invert-0"
    />
  </button>
</div>
</div>
</div>
</div>
</Portal>
)}

{/* پاپ‌آپ انتخاب ارز و منشأ ارز */}
{currencyModalOpen && (
  <Portal>
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={() => setCurrencyModalOpen(false)}
    >
      <div
        className="relative w-full max-w-xl mx-4 rounded-2xl bg-white text-neutral-900 border border-black/10 shadow-xl
                   dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* دکمه بستن گرد با آیکن bastan.svg */}
        <button
          type="button"
          onClick={() => setCurrencyModalOpen(false)}
          className="absolute left-3 top-3 h-9 w-9 grid place-items-center rounded-full bg-black text-white hover:bg-black/80"
          title="بستن"
        >
          <img
            src="/images/icons/bastan.svg"
            alt="بستن"
            className="w-5 h-5 invert"
          />
        </button>

        {/* هدر پاپ‌آپ */}
        <div className="px-5 pt-5 pb-3 pr-16">
          <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            انتخاب ارز و منشا ارز
          </div>
          <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            نوع ارز و منشا ارز را انتخاب کنید تا روی فرم اعمال شود.
          </div>
        </div>

        {/* بدنه پاپ‌آپ: دو ستون – نوع ارز و منشا ارز */}
        <div className="px-5 pb-4">
          {currencyErr && (
            <div className="mb-3 text-xs text-red-600 dark:text-red-400">
              {currencyErr}
            </div>
          )}

          {currencyLoading ? (
            <div className="py-10 text-center text-sm text-neutral-600 dark:text-neutral-300">
              در حال بارگذاری لیست ارزها…
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* لیست نوع ارز */}
              <div className="flex flex-col gap-2">
                <div className="text-xs text-neutral-600 dark:text-neutral-300 mb-1">
                  نوع ارز
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {(currencyItems || []).map((it) => {
                    const id =
                      it.id ?? it.code ?? it.value ?? it.currency_id ?? it.key;
                    const label =
                      it.label ||
                      it.title ||
                      it.name ||
                      it.code ||
                      it.symbol ||
                      `آیتم #${id}`;
                    const isActive =
                      selectedCurrencyId != null &&
                      String(selectedCurrencyId) === String(id);

                    return (
                      <button
                        key={String(id)}
                        type="button"
                        onClick={() => setSelectedCurrencyId(id)}
                        className={
                          'w-full text-right px-3 py-2 rounded-xl border text-xs md:text-sm transition cursor-pointer ' +
                          (isActive
                            ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-neutral-50 dark:text-neutral-900 dark:border-neutral-50'
                            : 'bg-white text-neutral-900 border-black/10 hover:bg-black/5 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800')
                        }
                      >
                        {label}
                      </button>
                    );
                  })}
                  {(currencyItems || []).length === 0 && (
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      ارزی ثبت نشده است.
                    </div>
                  )}
                </div>
              </div>

              {/* لیست منشا ارز */}
              <div className="flex flex-col gap-2">
                <div className="text-xs text-neutral-600 dark:text-neutral-300 mb-1">
                  منشا ارز
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {(currencySourceItems || []).map((it) => {
                    const id =
                      it.id ?? it.code ?? it.value ?? it.source_id ?? it.key;
                    const label =
                      it.label ||
                      it.title ||
                      it.name ||
                      it.code ||
                      `آیتم #${id}`;
                    const isActive =
                      selectedCurrencySourceId != null &&
                      String(selectedCurrencySourceId) === String(id);

                    return (
                      <button
                        key={String(id)}
                        type="button"
                        onClick={() => setSelectedCurrencySourceId(id)}
                        className={
                          'w-full text-right px-3 py-2 rounded-xl border text-xs md:text-sm transition cursor-pointer ' +
                          (isActive
                            ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-neutral-50 dark:text-neutral-900 dark:border-neutral-50'
                            : 'bg-white text-neutral-900 border-black/10 hover:bg-black/5 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800')
                        }
                      >
                        {label}
                      </button>
                    );
                  })}
                  {(currencySourceItems || []).length === 0 && (
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      منشا ارزی ثبت نشده است.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* فوتر پاپ‌آپ: فقط دکمه تایید با آیکن check.svg */}
        <div className="flex items-center justify-end gap-2 px-5 pb-4">
          <button
            type="button"
            onClick={applyCurrencySelection}
            className="h-10 w-10 grid place-items-center rounded-xl border border-black/10 bg-neutral-900 text-white hover:bg-black/80 transition
                       dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-black"
            title="تایید و اعمال"
          >
            <img
              src="/images/icons/check.svg"
              alt="تایید"
              className="w-5 h-5 invert"
            />
          </button>
        </div>
      </div>
    </div>
  </Portal>
)}

</Card>
</>
);
}
