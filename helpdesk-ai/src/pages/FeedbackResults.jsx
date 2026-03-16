import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import Breadcrumb from '../components/layout/Breadcrumb';
import api from '../api/api';

// ── Label maps ─────────────────────────────────────────────────────────────
const ROLE_LABELS = {
  student: 'Student', it_staff: 'IT Staff', faculty: 'Faculty',
  developer: 'Developer', manager: 'Manager', other: 'Other',
};
const PROCESS_LABELS = {
  email: 'Email', phone: 'Phone', walkin: 'Walk-in desk',
  portal: 'Online portal', chat: 'Chat/WhatsApp', none: 'No process',
};
const CHATBOT_LABELS  = { definitely: 'Definitely', probably: 'Probably', maybe: 'Maybe', no: 'No' };
const FREQ_LABELS     = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', rarely: 'Rarely' };
const IMP_LABELS      = { critical: 'Critical', important: 'Important', somewhat: 'Somewhat', notimportant: 'Not important' };
const PRIORITY_LABELS = {
  speed: 'Fast response', tracking: 'Real-time tracking', ai: 'AI-assisted',
  mobile: 'Mobile-friendly', notes: 'Resolution notes', availability: '24/7 availability',
};
const RESP_TIME_LABELS = {
  under1hr: 'Within 1 hour',
  '1to4hrs': '1–4 hours',
  sameday:  'Same working day',
  nextday:  'Next business day',
  flexible: 'No expectation',
};
const NOTIF_LABELS = {
  email:  'Email only',
  inapp:  'In-app notification',
  sms:    'SMS / WhatsApp',
  portal: 'Check portal',
  any:    'Any method',
};

const SAT_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e'];
const SAT_LABELS = ['Very Poor', 'Poor', 'Okay', 'Good', 'Excellent'];

const REFRESH_INTERVAL = 30_000;
const LAST_VISIT_KEY   = 'hiticket_fr_lastvisit';

// ── Word cloud (top distinct words from suggestions) ───────────────────────
const STOP = new Set(['the','and','a','an','to','of','in','is','it','i','that','for','on','with','this','be','have','was','are','but','not','so','we','at','or','from','they','were','as','by','our','you','do','my','your','all','can','more','if','would','very','also','please','get','has','just','use','when','out','up','about','us','will','its','than','make','how','one','there','they','some','been','what','had','he','she']);
const WordCloud = ({ allFeedback }) => {
  const freq = {};
  allFeedback.forEach(f => {
    (f.suggestions || '').toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/)
      .forEach(w => { if (w.length > 3 && !STOP.has(w)) freq[w] = (freq[w] || 0) + 1; });
  });
  const words = Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0,20);
  if (!words.length) return <p className="text-[12px] text-[#52525b]">No suggestion text yet.</p>;
  const maxF    = words[0][1];
  const sizes   = ['text-[10px]','text-[11px]','text-[12px]','text-[14px]','text-[16px]','text-[18px]','text-[20px]'];
  const palette = ['#3b82f6','#22c55e','#f59e0b','#a855f7','#06b6d4','#84cc16','#f97316','#ef4444'];
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {words.map(([w, c], i) => {
        const sIdx = Math.min(sizes.length - 1, Math.floor((c / maxF) * sizes.length));
        return (
          <span key={w} title={`${c} mention${c > 1 ? 's' : ''}`}
            className={`${sizes[sIdx]} font-semibold cursor-default hover:opacity-60 transition-opacity`}
            style={{ color: palette[i % palette.length] }}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

// ── Animated stat bar ──────────────────────────────────────────────────────
const StatBar = ({ label, count, total, color = '#3b82f6' }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 80);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-[12px] text-[#a1a1aa] flex-shrink-0 w-40 truncate">{label}</span>
      <div className="flex-1 h-2 bg-[#27272a] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${width}%`, backgroundColor: color }} />
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 w-24 justify-end">
        <span className="text-[12px] font-semibold" style={{ color }}>{count}</span>
        <span className="text-[11px] text-[#3f3f46]">({pct}%)</span>
      </div>
    </div>
  );
};

// ── Section card ───────────────────────────────────────────────────────────
const SCard = ({ title, subtitle, children, accent = '#3b82f6', icon }) => (
  <div className="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden">
    <div className="px-5 py-4 border-b border-[#27272a] flex items-center gap-3">
      {icon && (
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${accent}18` }}>
          <svg className="w-3.5 h-3.5" style={{ color: accent }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
      )}
      <div className="min-w-0">
        <h2 className="text-[13px] font-semibold text-[#fafafa] leading-tight">{title}</h2>
        {subtitle && <p className="text-[11px] text-[#52525b] mt-0.5">{subtitle}</p>}
      </div>
      <div className="ml-auto w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: accent }} />
    </div>
    <div className="p-5">{children}</div>
  </div>
);

// ── SVG donut ring ─────────────────────────────────────────────────────────
const DonutRing = ({ dist, total, avg }) => {
  const R = 52, cx = 64, cy = 64, strokeW = 16;
  const circ = 2 * Math.PI * R;
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 120); return () => clearTimeout(t); }, []);

  let usedLen = 0;
  const segments = [5, 4, 3, 2, 1].map(n => {
    const frac = total > 0 ? (dist?.[n] || 0) / total : 0;
    const len = frac * circ;
    const offset = -(usedLen);
    usedLen += len;
    return { n, len, offset, color: SAT_COLORS[n - 1] };
  });

  return (
    <div className="flex items-center gap-6">
      <div className="relative flex-shrink-0">
        <svg width="128" height="128" viewBox="0 0 128 128">
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="#27272a" strokeWidth={strokeW} />
          {segments.map(s => (
            <circle key={s.n} cx={cx} cy={cy} r={R} fill="none"
              stroke={s.color} strokeWidth={strokeW}
              strokeDasharray={ready ? `${s.len} ${circ - s.len}` : `0 ${circ}`}
              strokeDashoffset={s.offset}
              style={{
                transition: 'stroke-dasharray 0.8s ease-out',
                transformOrigin: 'center',
                transform: 'rotate(-90deg)',
              }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[22px] font-black leading-none"
            style={{ color: avg >= 4 ? '#22c55e' : avg >= 3 ? '#f59e0b' : '#ef4444' }}>{avg}</span>
          <span className="text-[9px] text-[#52525b] leading-none mt-0.5">/ 5</span>
        </div>
      </div>
      <div className="space-y-1 flex-1">
        {[5, 4, 3, 2, 1].map(n => (
          <StatBar key={n} label={`${n}★ ${SAT_LABELS[n - 1]}`}
            count={dist?.[n] || 0} total={total} color={SAT_COLORS[n - 1]} />
        ))}
      </div>
    </div>
  );
};

// ── Response volume sparkline ──────────────────────────────────────────────
const Sparkline = ({ allFeedback }) => {
  const DAYS = 14;
  const now = new Date();
  const buckets = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (DAYS - 1 - i));
    return { label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), count: 0 };
  });
  allFeedback.forEach(f => {
    const fd = new Date(f.createdAt);
    const start = new Date(now); start.setDate(now.getDate() - DAYS + 1); start.setHours(0,0,0,0);
    const idx = Math.floor((fd - start) / 86400000);
    if (idx >= 0 && idx < DAYS) buckets[idx].count++;
  });
  const max = Math.max(...buckets.map(b => b.count), 1);
  return (
    <div>
      <div className="flex items-end gap-1 h-14">
        {buckets.map((b, i) => (
          <div key={i} className="flex-1 flex flex-col items-center group relative">
            <div className="w-full rounded-sm bg-[#3b82f6]/20 hover:bg-[#3b82f6]/50 transition-colors cursor-default"
              style={{ height: `${Math.max(3, (b.count / max) * 56)}px` }} />
            {b.count > 0 && (
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-[#3b82f6] font-bold
                opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {b.count}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[9px] text-[#3f3f46]">{buckets[0].label}</span>
        <span className="text-[9px] text-[#3f3f46]">{buckets[DAYS - 1].label}</span>
      </div>
    </div>
  );
};

// ── Role × Satisfaction cross-tab ──────────────────────────────────────────
const CrossTab = ({ allFeedback }) => {
  const data = Object.entries(ROLE_LABELS).map(([key, label]) => {
    const rs = allFeedback.filter(f => f.role === key);
    const avg = rs.length > 0
      ? parseFloat((rs.reduce((s, f) => s + f.satisfaction, 0) / rs.length).toFixed(1))
      : null;
    return { key, label, count: rs.length, avg };
  }).filter(d => d.count > 0).sort((a, b) => b.count - a.count);

  if (!data.length) return <p className="text-[12px] text-[#52525b]">No data yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-[#27272a]">
            {['Role', 'Responses', 'Avg Rating', 'Visual'].map(h => (
              <th key={h} className="text-left py-2 pr-4 text-[10px] font-semibold text-[#52525b] uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1c1c1f]">
          {data.map(({ key, label, count, avg }) => (
            <tr key={key} className="hover:bg-[#1c1c1f] transition-colors">
              <td className="py-2.5 pr-4 text-[#a1a1aa] font-medium">{label}</td>
              <td className="py-2.5 pr-4 text-[#52525b]">{count}</td>
              <td className="py-2.5 pr-4">
                <span className="font-bold text-[13px]"
                  style={{ color: avg >= 4 ? '#22c55e' : avg >= 3 ? '#f59e0b' : '#ef4444' }}>
                  {avg ?? '—'}
                </span>
              </td>
              <td className="py-2.5">
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(n => (
                    <div key={n} className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: avg && n <= Math.round(avg) ? SAT_COLORS[Math.round(avg) - 1] : '#27272a' }} />
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function FeedbackResults() {
  const navigate = useNavigate();

  // ── Core data ──────────────────────────────────────────────────────────
  const [stats, setStats]             = useState(null);
  const [feedback, setFeedback]       = useState([]);
  const [allFeedback, setAllFeedback] = useState([]);   // all items for sparkline + cross-tab
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState('');
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [copyDone, setCopyDone]       = useState(false);
  const intervalRef                   = useRef(null);

  // ── View controls ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab]   = useState('charts');   // 'charts' | 'responses'
  const [expanded, setExpanded]     = useState(null);
  const [search, setSearch]         = useState('');
  const [satFilter, setSatFilter]   = useState(0);          // 0 = all, 1-5 = filter
  const [sortKey, setSortKey]       = useState('date');      // 'date' | 'sat' | 'role'
  const [sortDir, setSortDir]       = useState('desc');
  const [selected, setSelected]     = useState(new Set());  // bulk-delete IDs
  const [dateRange, setDateRange]   = useState('all');       // 'all' | '30' | '7'
  const [lastVisit, setLastVisit]   = useState(null);
  const [copyResponseDone, setCopyResponseDone] = useState(null);
  const [hasSuggFilter, setHasSuggFilter] = useState(false);  // only show rows with a comment

  // Record visit timestamp for "new since last visit" badges
  useEffect(() => {
    const prev = localStorage.getItem(LAST_VISIT_KEY);
    if (prev) setLastVisit(new Date(prev));
    localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
  }, []);

  const fetchAll = useCallback(async (pg = 1, silent = false) => {
    if (!silent) pg === 1 ? setLoading(true) : setRefreshing(true);
    else setRefreshing(true);
    setError('');
    try {
      const [sr, lr, allr] = await Promise.all([
        api.get('/feedback/stats'),
        api.get(`/feedback?page=${pg}&limit=15`),
        api.get('/feedback?page=1&limit=1000'),
      ]);
      setStats(sr.data);
      setFeedback(lr.data.feedback || []);
      setTotal(lr.data.total || 0);
      setTotalPages(lr.data.pages || 1);
      setAllFeedback(allr.data.feedback || []);
      setLastUpdated(new Date());
    } catch (err) {
      if (!silent) setError(err.response?.data?.error || 'Failed to load feedback');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(page); }, [page]);

  // Auto-refresh every 30 s (silent background poll)
  useEffect(() => {
    intervalRef.current = setInterval(() => fetchAll(page, true), REFRESH_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [page, fetchAll]);

  const handleManualRefresh = () => {
    clearInterval(intervalRef.current);
    fetchAll(page, true);
    intervalRef.current = setInterval(() => fetchAll(page, true), REFRESH_INTERVAL);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/feedback/${id}`);
      setFeedback(prev => prev.filter(f => f._id !== id));
      setAllFeedback(prev => prev.filter(f => f._id !== id));
      setTotal(t => t - 1);
      if (stats) setStats(s => ({ ...s, total: s.total - 1 }));
      setExpanded(null);
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
    } catch {
      setError('Failed to delete response');
    }
  };

  const handleBulkDelete = async () => {
    if (!selected.size) return;
    try {
      await Promise.all([...selected].map(id => api.delete(`/feedback/${id}`)));
      const ids = selected;
      setFeedback(prev => prev.filter(f => !ids.has(f._id)));
      setAllFeedback(prev => prev.filter(f => !ids.has(f._id)));
      setTotal(t => t - ids.size);
      if (stats) setStats(s => ({ ...s, total: s.total - ids.size }));
      setSelected(new Set());
      setExpanded(null);
    } catch {
      setError('Failed to delete selected responses');
    }
  };

  const toggleSelect = (id) => setSelected(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const toggleSelectAll = () => setSelected(prev =>
    prev.size === processedFeedback.length ? new Set() : new Set(processedFeedback.map(f => f._id))
  );

  const exportCSV = () => {
    if (!feedback.length) return;
    const headers = ['Date', 'Name', 'Role', 'Current Process', 'Satisfaction', 'Priorities', 'Would Use Chatbot', 'Issue Frequency', 'Response Time Expectation', 'Notif. Preference', 'Status Importance', 'Suggestions'];
      const rows = feedback.map((f) => [
        new Date(f.createdAt).toLocaleDateString('en-GB'),
        f.name || '—',
        f.role, f.currentProcess, f.satisfaction,
        (f.priorities || []).join('; '),
        f.wouldUseChatbot, f.issueFrequency,
        f.responseTime || '', f.notifPreference || '',
        f.statusImportance,
        `"${(f.suggestions || '').replace(/"/g, '""')}"`,
      ]);
    const csv  = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `hiticket-survey-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/survey`);
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 2000);
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const positiveIntent = stats
    ? Math.round((((stats.chatbot?.definitely || 0) + (stats.chatbot?.probably || 0)) / Math.max(stats.total, 1)) * 100)
    : 0;
  const topRole     = stats?.roles     ? Object.entries(stats.roles).sort((a,b) => b[1]-a[1])[0]?.[0]     : null;
  const topProcess  = stats?.processes ? Object.entries(stats.processes).sort((a,b) => b[1]-a[1])[0]?.[0] : null;
  const topPriority = stats?.priorities? Object.entries(stats.priorities).sort((a,b) => b[1]-a[1])[0]?.[0]: null;

  const completionRate = allFeedback.length > 0
    ? Math.round((allFeedback.filter(f => f.suggestions?.trim()).length / allFeedback.length) * 100)
    : 0;

  // Date-range filtered subset for stat chips + trend
  const nowTs = new Date();
  const rangedFeedback = allFeedback.filter(f => {
    if (dateRange === 'all') return true;
    const days = parseInt(dateRange, 10);
    const cutoff = new Date(nowTs); cutoff.setDate(nowTs.getDate() - days);
    return new Date(f.createdAt) >= cutoff;
  });
  const prevFeedback = (() => {
    if (dateRange === 'all') return [];
    const days = parseInt(dateRange, 10);
    const end   = new Date(nowTs); end.setDate(nowTs.getDate() - days);
    const start = new Date(nowTs); start.setDate(nowTs.getDate() - days * 2);
    return allFeedback.filter(f => { const d = new Date(f.createdAt); return d >= start && d < end; });
  })();
  const rangedAvg = rangedFeedback.length
    ? parseFloat((rangedFeedback.reduce((s,f) => s + f.satisfaction, 0) / rangedFeedback.length).toFixed(2))
    : null;
  const prevAvg = prevFeedback.length
    ? parseFloat((prevFeedback.reduce((s,f) => s + f.satisfaction, 0) / prevFeedback.length).toFixed(2))
    : null;
  const trendDiff = (rangedAvg !== null && prevAvg !== null) ? +(rangedAvg - prevAvg).toFixed(2) : null;

  // Copy single response as text
  const copyResponse = (f) => {
    const lines = [
      `Date: ${new Date(f.createdAt).toLocaleDateString('en-GB')}`,
      f.name ? `Name: ${f.name}` : null,
      `Role: ${ROLE_LABELS[f.role] || f.role}`,
      `Satisfaction: ${f.satisfaction}/5`,
      `Process: ${PROCESS_LABELS[f.currentProcess] || f.currentProcess}`,
      `AI Chatbot: ${CHATBOT_LABELS[f.wouldUseChatbot] || f.wouldUseChatbot}`,
      f.suggestions ? `Suggestion: ${f.suggestions}` : null,
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(lines);
    setCopyResponseDone(f._id);
    setTimeout(() => setCopyResponseDone(null), 2000);
  };

  // Needs-attention: lowest-sat response that also has a suggestion
  const needsAttention = allFeedback.length > 0
    ? [...allFeedback]
        .filter(f => f.suggestions?.trim())
        .sort((a, b) => a.satisfaction - b.satisfaction || new Date(b.createdAt) - new Date(a.createdAt))[0]
    : null;

  // Filter + sort pipeline for the responses table (current page)
  const processedFeedback = (() => {
    let list = [...feedback];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(f =>
        (f.name || '').toLowerCase().includes(q) ||
        ROLE_LABELS[f.role]?.toLowerCase().includes(q) ||
        (f.suggestions || '').toLowerCase().includes(q)
      );
    }
    if (satFilter > 0) list = list.filter(f => f.satisfaction === satFilter);
    if (hasSuggFilter) list = list.filter(f => f.suggestions?.trim());
    list.sort((a, b) => {
      if (sortKey === 'sat')  return sortDir === 'desc' ? b.satisfaction - a.satisfaction : a.satisfaction - b.satisfaction;
      if (sortKey === 'role') return sortDir === 'asc'
        ? (ROLE_LABELS[a.role] || '').localeCompare(ROLE_LABELS[b.role] || '')
        : (ROLE_LABELS[b.role] || '').localeCompare(ROLE_LABELS[a.role] || '');
      return sortDir === 'desc'
        ? new Date(b.createdAt) - new Date(a.createdAt)
        : new Date(a.createdAt) - new Date(b.createdAt);
    });
    return list;
  })();

  // Keep alias for backward compat with JSX below
  const filteredFeedback = processedFeedback;

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortBtn = ({ k, label }) => (
    <button onClick={() => toggleSort(k)}
      className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
        sortKey === k ? 'text-[#3b82f6]' : 'text-[#52525b] hover:text-[#a1a1aa]'
      }`}>
      {label}
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        {sortKey === k && sortDir === 'asc'
          ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          : <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />}
      </svg>
    </button>
  );

  const insights = stats && stats.total > 0 ? [
    positiveIntent >= 50
      ? `${positiveIntent}% of respondents would use the AI chatbot`
      : `Only ${positiveIntent}% would use the AI chatbot — consider showcasing its value`,
    topRole     ? `Most responses from ${ROLE_LABELS[topRole]}s`                : null,
    topPriority ? `Top priority: ${PRIORITY_LABELS[topPriority]}`              : null,
    topProcess  ? `Most common current process: ${PROCESS_LABELS[topProcess]}` : null,
    stats.avgSatisfaction >= 4
      ? `High satisfaction: ${stats.avgSatisfaction}/5 average`
      : `Satisfaction needs attention: ${stats.avgSatisfaction}/5 average`,
  ].filter(Boolean) : [];

  return (
    <PageWrapper>
      <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-5 overflow-x-hidden">
        <Breadcrumb />

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#3b82f6]/8 via-[#8b5cf6]/4 to-transparent border border-[#3b82f6]/15">
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-[22px] sm:text-[24px] font-bold text-[#fafafa]">Survey Results</h1>
              <div className="flex items-center gap-1">
                {[['all','All time'],['30','Last 30d'],['7','Last 7d']].map(([v,l]) => (
                  <button key={v} onClick={() => setDateRange(v)}
                    className={`px-2.5 py-1 text-[10px] rounded-lg font-medium transition-colors ${
                      dateRange === v ? 'bg-[#3b82f6] text-white' : 'bg-[#27272a] text-[#71717a] hover:text-[#a1a1aa]'
                    }`}>{l}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-[13px] text-[#a1a1aa]">{stats?.total || 0} responses · admin only</p>
              {lastUpdated && (
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${refreshing ? 'bg-[#f59e0b] animate-pulse' : 'bg-[#22c55e]'}`} />
                  <span className="text-[11px] text-[#3f3f46]">
                    {refreshing ? 'Refreshing…' : `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              title="Refresh now"
              className="flex items-center gap-1.5 px-3 py-2 bg-[#27272a] hover:bg-[#3f3f46] text-[#a1a1aa] hover:text-[#fafafa] text-[12px] font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <svg className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#27272a] hover:bg-[#3f3f46] text-[#a1a1aa] hover:text-[#fafafa] text-[12px] font-medium rounded-lg transition-colors"
            >
              {copyDone ? (
                <svg className="w-3.5 h-3.5 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
              )}
              {copyDone ? 'Copied!' : 'Copy Link'}
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#27272a] hover:bg-[#3f3f46] text-[#fafafa] text-[12px] font-medium rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Export CSV
            </button>
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-1.5 text-[12px] text-[#a1a1aa] hover:text-white transition-colors px-2 py-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
              Back
            </button>
          </div>
        </div>

        {/* ── Loading skeleton ────────────────────────────────────────── */}
        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {Array.from({ length: 7 }).map((_,i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_,i) => <div key={i} className="skeleton h-48 rounded-xl" />)}
            </div>
          </div>

        ) : error ? (
          <div className="p-5 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl flex items-center gap-3 text-[#ef4444] text-[13px]">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            {error}
          </div>

        ) : !stats || stats.total === 0 ? (
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-16 text-center">
            <div className="w-14 h-14 bg-[#27272a] rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-[#52525b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            </div>
            <p className="text-[15px] font-semibold text-[#fafafa] mb-2">No survey responses yet</p>
            <p className="text-[13px] text-[#52525b] max-w-xs mx-auto mb-6 leading-relaxed">Share the survey link with users to start collecting feedback. Results appear here automatically.</p>
            <button onClick={copyLink} className="px-5 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-medium rounded-lg transition-colors">
              Copy Survey Link
            </button>
          </div>

        ) : (
          <>
            {/* ── Needs-attention banner ──────────────────────────────── */}
            {needsAttention && needsAttention.satisfaction <= 2 && (
              <div className="mb-5 p-4 bg-[#ef4444]/6 border border-[#ef4444]/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-[#ef4444] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  <span className="text-[11px] font-semibold text-[#ef4444] uppercase tracking-widest">Needs Attention</span>
                  <span className="text-[10px] text-[#3f3f46] ml-1">· lowest-rated response with a suggestion</span>
                </div>
                <div className="flex flex-wrap gap-2 items-start">
                  <span className="px-2 py-0.5 text-[10px] rounded-full bg-[#8b5cf6]/10 text-[#a78bfa] font-medium">
                    {ROLE_LABELS[needsAttention.role]}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(n => (
                      <svg key={n} className="w-3 h-3" viewBox="0 0 20 20"
                        fill={n <= needsAttention.satisfaction ? '#ef4444' : '#27272a'}>
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    <span className="text-[10px] text-[#ef4444] ml-1 font-semibold">{needsAttention.satisfaction}/5</span>
                  </div>
                  <p className="text-[12px] text-[#a1a1aa] italic flex-1">"{needsAttention.suggestions}"</p>
                </div>
              </div>
            )}

            {/* ── Key Insights banner ─────────────────────────────────── */}
            {insights.length > 0 && (
              <div className="mb-5 p-4 bg-[#3b82f6]/5 border border-[#3b82f6]/15 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-[#3b82f6] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <span className="text-[11px] font-semibold text-[#3b82f6] uppercase tracking-widest">Key Insights</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {insights.map((insight, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181b] border border-[#27272a] text-[12px] text-[#a1a1aa]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] flex-shrink-0" />
                      {insight}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Summary stat chips ─────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
              {[
                { label: 'Total Responses',  value: dateRange !== 'all' ? rangedFeedback.length : stats.total, color: '#3b82f6', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                { label: 'Avg Satisfaction', value: rangedAvg !== null ? `${rangedAvg}/5` : `${stats.avgSatisfaction}/5`, color: '#f59e0b', trend: trendDiff, icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
                { label: 'Want AI Chatbot',  value: `${positiveIntent}%`,                color: '#22c55e', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2' },
                { label: 'Top Respondent',   value: ROLE_LABELS[topRole] || '—',          color: '#a855f7', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
                { label: 'Top Priority',     value: PRIORITY_LABELS[topPriority] || '—',  color: '#06b6d4', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
                { label: 'Top Process Now',  value: PROCESS_LABELS[topProcess] || '—',   color: '#f97316', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
                { label: 'Wrote Suggestions',value: `${completionRate}%`,                color: '#84cc16', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
              ].map(({ label, value, color, icon, trend }) => (
                <div key={label} className="bg-[#18181b] border border-[#27272a] rounded-xl p-4">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: `${color}18` }}>
                    <svg className="w-3.5 h-3.5" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                    </svg>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <div className="text-[18px] sm:text-[20px] font-bold leading-tight mb-0.5 truncate" style={{ color }}>{value}</div>
                    {trend != null && (
                      <span className={`text-[10px] font-semibold flex-shrink-0 ${trend > 0 ? 'text-[#22c55e]' : trend < 0 ? 'text-[#ef4444]' : 'text-[#52525b]'}`}>
                        {trend > 0 ? `↑+${trend}` : trend < 0 ? `↓${trend}` : '→'}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-[#52525b] leading-tight">{label}</div>
                </div>
              ))}
            </div>

            {/* ── Chart / Responses tab switcher ─────────────────────── */}
            <div className="flex gap-1 mb-5 bg-[#18181b] border border-[#27272a] rounded-xl p-1 w-fit">
              {[
                { id: 'charts',    label: 'Analytics',  icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                { id: 'responses', label: 'Responses',  icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${
                    activeTab === tab.id ? 'bg-[#3b82f6] text-white shadow' : 'text-[#52525b] hover:text-[#a1a1aa]'
                  }`}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                  </svg>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ══ ANALYTICS TAB ═══════════════════════════════════ */}
            {activeTab === 'charts' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

              <SCard
                title="Satisfaction Distribution"
                subtitle="How users rated their current IT support experience"
                accent="#f59e0b"
                icon="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              >
                <DonutRing dist={stats.satisfactionDist} total={stats.total} avg={stats.avgSatisfaction} />
              </SCard>

              <SCard
                title="Response Volume (last 14 days)"
                subtitle="Day-by-day submissions — hover a bar to see count"
                accent="#3b82f6"
                icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              >
                <Sparkline allFeedback={allFeedback} />
              </SCard>

              <SCard
                title="Would Use AI Chatbot?"
                subtitle="Likelihood to use an AI-powered ticket submission assistant"
                accent="#22c55e"
                icon="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2"
              >
                <div className="mb-4">
                  <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-2">
                    {[
                      { key: 'definitely', color: '#22c55e' },
                      { key: 'probably',   color: '#84cc16' },
                      { key: 'maybe',      color: '#f59e0b' },
                      { key: 'no',         color: '#3f3f46' },
                    ].map(({ key, color }) => {
                      const pct = stats.total > 0 ? ((stats.chatbot?.[key] || 0) / stats.total) * 100 : 0;
                      return pct > 0 ? <div key={key} style={{ width: `${pct}%`, backgroundColor: color }} /> : null;
                    })}
                  </div>
                </div>
                {Object.entries(CHATBOT_LABELS).map(([key, label]) => (
                  <StatBar
                    key={key} label={label}
                    count={stats.chatbot?.[key] || 0} total={stats.total}
                    color={key === 'definitely' ? '#22c55e' : key === 'probably' ? '#84cc16' : key === 'maybe' ? '#f59e0b' : '#52525b'}
                  />
                ))}
              </SCard>

              <SCard
                title="Role × Satisfaction"
                subtitle="Average satisfaction score broken down by respondent role"
                accent="#a855f7"
                icon="M3 10h18M3 14h18M10 5v14M14 5v14"
              >
                <CrossTab allFeedback={allFeedback} />
              </SCard>

              <SCard
                title="Respondent Roles"
                subtitle="Who filled in the survey"
                accent="#8b5cf6"
                icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              >
                {Object.entries(ROLE_LABELS).map(([key, label]) => (
                  <StatBar key={key} label={label} count={stats.roles?.[key] || 0} total={stats.total} color="#8b5cf6" />
                ))}
              </SCard>

              <SCard
                title="Current IT Support Process"
                subtitle="How users currently raise IT issues"
                accent="#f97316"
                icon="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              >
                {Object.entries(PROCESS_LABELS).map(([key, label]) => (
                  <StatBar key={key} label={label} count={stats.processes?.[key] || 0} total={stats.total} color="#f97316" />
                ))}
              </SCard>

              <SCard
                title="What Matters Most"
                subtitle="Multi-select — up to 3 priorities per respondent"
                accent="#06b6d4"
                icon="M13 10V3L4 14h7v7l9-11h-7z"
              >
                {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                  <StatBar key={key} label={label} count={stats.priorities?.[key] || 0} total={stats.total} color="#06b6d4" />
                ))}
              </SCard>

              <SCard
                title="How Often They Face IT Issues"
                subtitle="Frequency of needing IT support"
                accent="#3b82f6"
                icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              >
                {Object.entries(FREQ_LABELS).map(([key, label]) => (
                  <StatBar key={key} label={label} count={stats.frequency?.[key] || 0} total={stats.total} color="#3b82f6" />
                ))}
              </SCard>

              <SCard
                title="Real-Time Status Importance"
                subtitle="How much users value knowing their ticket status"
                accent="#ef4444"
                icon="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              >
                {Object.entries(IMP_LABELS).map(([key, label]) => (
                  <StatBar
                    key={key} label={label}
                    count={stats.importance?.[key] || 0} total={stats.total}
                    color={key === 'critical' ? '#ef4444' : key === 'important' ? '#f97316' : key === 'somewhat' ? '#f59e0b' : '#52525b'}
                  />
                ))}
              </SCard>

              <SCard
                title="Expected Response Time"
                subtitle="How quickly users expect first acknowledgement"
                accent="#06b6d4"
                icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              >
                {Object.entries(RESP_TIME_LABELS).map(([key, label]) => (
                  <StatBar key={key} label={label} count={stats.responseTime?.[key] || 0} total={stats.total} color="#06b6d4" />
                ))}
              </SCard>

              <SCard
                title="Preferred Notification Method"
                subtitle="How users want to receive ticket status updates"
                accent="#a855f7"
                icon="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              >
                {Object.entries(NOTIF_LABELS).map(([key, label]) => (
                  <StatBar key={key} label={label} count={stats.notifPreference?.[key] || 0} total={stats.total} color="#a855f7" />
                ))}
              </SCard>

              {/* ── Suggestions word cloud ── */}
              {allFeedback.some(f => f.suggestions?.trim()) && (
                <div className="lg:col-span-2">
                  <SCard
                    title="Suggestions Word Cloud"
                    subtitle="Most frequent words in open-ended feedback — hover a word for count"
                    accent="#06b6d4"
                    icon="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                  >
                    <WordCloud allFeedback={allFeedback} />
                  </SCard>
                </div>
              )}

            </div>
            )}

            {/* ── Individual Responses ────────────────────────── */}
            {activeTab === 'responses' && (
            <div className="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden">

              {/* Toolbar row */}
              <div className="px-5 py-4 border-b border-[#27272a] flex flex-wrap items-center gap-3">
                <div>
                  <h2 className="text-[13px] font-semibold text-[#fafafa]">Individual Responses</h2>
                  <p className="text-[11px] text-[#52525b] mt-0.5">
                    {filteredFeedback.length} shown · {total} total{totalPages > 1 ? ` · page ${page} of ${totalPages}` : ''}
                  </p>
                </div>

                {/* Search */}
                <div className="relative">
                  <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#52525b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
                  </svg>
                  <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search name, role or suggestion…"
                    className="pl-8 pr-3 py-1.5 bg-[#09090b] border border-[#27272a] rounded-lg text-[12px] text-[#fafafa] placeholder-[#3f3f46] focus:outline-none focus:border-[#3b82f6] w-52 transition-colors"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#3f3f46] hover:text-[#a1a1aa]">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  )}
                </div>

                {/* Star filter */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-[#52525b] mr-1">Rating:</span>
                  <button onClick={() => setSatFilter(0)}
                    className={`px-2 py-1 text-[10px] rounded-md transition-colors ${satFilter === 0 ? 'bg-[#3b82f6] text-white' : 'bg-[#27272a] text-[#a1a1aa] hover:bg-[#3f3f46]'}`}>
                    All
                  </button>
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setSatFilter(satFilter === n ? 0 : n)}
                      className={`px-2 py-1 text-[10px] rounded-md transition-colors ${satFilter === n ? 'text-white' : 'bg-[#27272a] text-[#a1a1aa] hover:bg-[#3f3f46]'}`}
                      style={satFilter === n ? { backgroundColor: SAT_COLORS[n-1] } : {}}>
                      {n}★
                    </button>
                  ))}
                </div>

                {/* Has-suggestion filter */}
                <button onClick={() => setHasSuggFilter(v => !v)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] rounded-md font-medium transition-colors ${
                    hasSuggFilter ? 'bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30' : 'bg-[#27272a] text-[#a1a1aa] hover:bg-[#3f3f46]'
                  }`}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                  Has comment
                </button>

                {/* Sort controls */}
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-[10px] text-[#52525b]">Sort:</span>
                  <SortBtn k="date" label="Date" />
                  <SortBtn k="sat"  label="Rating" />
                  <SortBtn k="role" label="Role" />
                </div>
              </div>

              {/* Bulk-delete bar */}
              {selected.size > 0 && (
                <div className="px-5 py-2.5 bg-[#ef4444]/8 border-b border-[#ef4444]/20 flex items-center justify-between">
                  <span className="text-[12px] text-[#ef4444] font-medium">{selected.size} selected</span>
                  <div className="flex gap-3 items-center">
                    <button onClick={() => setSelected(new Set())}
                      className="text-[11px] text-[#52525b] hover:text-[#a1a1aa] transition-colors">
                      Clear
                    </button>
                    <button onClick={handleBulkDelete}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ef4444] hover:bg-[#dc2626] text-white text-[11px] font-medium rounded-lg transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      Delete {selected.size}
                    </button>
                  </div>
                </div>
              )}

              {/* Column header */}
              <div className="px-5 py-2 border-b border-[#27272a] flex items-center gap-3 bg-[#0d0d0f]">
                <input type="checkbox"
                  checked={filteredFeedback.length > 0 && selected.size === filteredFeedback.length}
                  onChange={toggleSelectAll}
                  className="w-3.5 h-3.5 accent-[#3b82f6] flex-shrink-0" />
                <span className="w-1 flex-shrink-0" />{/* sentinel for color bar */}
                <span className="text-[10px] text-[#3f3f46] w-6">#</span>
                <span className="text-[10px] text-[#3f3f46] w-28">Date</span>
                <span className="text-[10px] text-[#3f3f46] w-24 hidden md:block">Name</span>
                <span className="text-[10px] text-[#3f3f46] w-28">Role</span>
                <span className="text-[10px] text-[#3f3f46] w-24">Rating</span>
                <span className="text-[10px] text-[#3f3f46] flex-1 hidden lg:block">Comment snippet</span>
                <span className="text-[10px] text-[#3f3f46] w-28 hidden sm:block">AI Chatbot</span>
                <span className="w-20" />
              </div>

              {filteredFeedback.length === 0 ? (
                <div className="p-10 text-center">
                  <svg className="w-8 h-8 text-[#3f3f46] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                  <p className="text-[13px] text-[#52525b]">{search || satFilter || hasSuggFilter ? 'No responses match your filters.' : 'No responses on this page.'}</p>
                  {(search || satFilter || hasSuggFilter) && (
                    <button onClick={() => { setSearch(''); setSatFilter(0); setHasSuggFilter(false); }}
                      className="mt-3 text-[11px] text-[#3b82f6] hover:underline">Clear all filters</button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-[#27272a]">
                  {filteredFeedback.map((f, idx) => {
                    const sentColor = SAT_COLORS[f.satisfaction - 1];
                    const isNew = lastVisit && new Date(f.createdAt) > lastVisit;
                    const snippetText = f.suggestions?.trim();
                    return (
                    <div key={f._id} className={`transition-colors ${selected.has(f._id) ? 'bg-[#3b82f6]/4' : 'hover:bg-[#1c1c1f]'}`}>
                      <div className="flex items-center gap-3 pr-4 py-3 pl-0">
                        {/* Satisfaction color bar */}
                        <div className="w-1 self-stretch flex-shrink-0 rounded-r-full" style={{ backgroundColor: sentColor, opacity: 0.7 }} />
                        <input type="checkbox" checked={selected.has(f._id)}
                          onChange={() => toggleSelect(f._id)}
                          className="w-3.5 h-3.5 accent-[#3b82f6] flex-shrink-0" />
                        <span className="text-[10px] font-mono text-[#3f3f46] w-6 flex-shrink-0">
                          {(page - 1) * 15 + idx + 1}
                        </span>
                        <div className="w-28 flex-shrink-0">
                          <span className="text-[10px] font-mono text-[#52525b] block">
                            {new Date(f.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-[9px] text-[#3f3f46]">
                            {new Date(f.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="w-24 flex-shrink-0 hidden md:block">
                          {f.name
                            ? <span className="text-[12px] text-[#fafafa] font-semibold truncate block">{f.name}</span>
                            : <span className="text-[10px] text-[#3f3f46] italic">Anonymous</span>
                          }
                        </div>
                        <div className="w-28 flex-shrink-0">
                          <span className="inline-flex px-2 py-0.5 text-[10px] rounded-full bg-[#8b5cf6]/10 text-[#a78bfa] font-medium truncate max-w-full">
                            {ROLE_LABELS[f.role] || f.role}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 w-24 flex-shrink-0">
                          <div className="flex items-center gap-0.5">
                            {[1,2,3,4,5].map(n => (
                              <svg key={n} className="w-3 h-3" viewBox="0 0 20 20" fill={n <= f.satisfaction ? sentColor : '#27272a'}>
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span className="text-[10px] font-bold" style={{ color: sentColor }}>{f.satisfaction}</span>
                        </div>
                        {/* Suggestion snippet */}
                        <div className="flex-1 min-w-0 hidden lg:block">
                          {snippetText
                            ? <p className="text-[11px] text-[#71717a] truncate italic">"{snippetText.slice(0, 60)}{snippetText.length > 60 ? '…' : ''}"</p>
                            : <span className="text-[10px] text-[#3f3f46]">No comment</span>
                          }
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] rounded-full font-medium w-28 text-center flex-shrink-0 hidden sm:block ${
                          ['definitely','probably'].includes(f.wouldUseChatbot)
                            ? 'bg-[#22c55e]/10 text-[#22c55e]'
                            : 'bg-[#27272a] text-[#71717a]'
                        }`}>
                          {CHATBOT_LABELS[f.wouldUseChatbot]}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isNew && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-[#3b82f6] text-white">NEW</span>
                          )}
                          <button onClick={() => setExpanded(expanded === f._id ? null : f._id)}
                            className={`flex items-center gap-1 text-[11px] transition-colors flex-shrink-0 ${
                              expanded === f._id ? 'text-[#3b82f6]' : 'text-[#52525b] hover:text-[#a1a1aa]'
                            }`}>
                            <svg className={`w-3.5 h-3.5 transition-transform ${expanded === f._id ? 'rotate-180' : ''}`}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                            {expanded === f._id ? 'Less' : 'Details'}
                          </button>
                        </div>
                      </div>

                      {expanded === f._id && (
                        <div className="ml-1 mr-4 mb-4 rounded-xl bg-[#0d0d0f] border border-[#27272a] overflow-hidden">
                          {/* Expanded header */}
                          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#27272a]" style={{ borderLeftColor: sentColor, borderLeftWidth: 3 }}>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-[#fafafa]">
                                {f.name || 'Anonymous respondent'}
                                {f.name && <span className="ml-2 text-[11px] text-[#52525b] font-normal">{ROLE_LABELS[f.role]}</span>}
                              </p>
                              <p className="text-[10px] text-[#3f3f46] mt-0.5">
                                {new Date(f.createdAt).toLocaleDateString('en-GB', { weekday:'short', day:'2-digit', month:'short', year:'numeric' })} at {new Date(f.createdAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-[11px] font-bold" style={{ color: sentColor }}>{SAT_LABELS[f.satisfaction - 1]}</span>
                              <span className="text-[18px] leading-none">{['😤','😕','😐','🙂','😊'][f.satisfaction - 1]}</span>
                            </div>
                          </div>

                          {/* Detail grid */}
                          <div className="p-4">
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
                              {[
                                { label: 'Current process',       value: PROCESS_LABELS[f.currentProcess] },
                                { label: 'Issue frequency',        value: FREQ_LABELS[f.issueFrequency] },
                                { label: 'Status importance',      value: IMP_LABELS[f.statusImportance] },
                                ...(f.responseTime    ? [{ label: 'Response expectation', value: RESP_TIME_LABELS[f.responseTime] }] : []),
                                ...(f.notifPreference ? [{ label: 'Notif. preference',    value: NOTIF_LABELS[f.notifPreference] }] : []),
                              ].map(({ label, value }) => value ? (
                                <div key={label} className="bg-[#18181b] rounded-lg px-3 py-2">
                                  <p className="text-[9px] text-[#52525b] mb-0.5 uppercase tracking-wider">{label}</p>
                                  <p className="text-[12px] text-[#a1a1aa] font-medium">{value}</p>
                                </div>
                              ) : null)}
                            </div>
                            {f.priorities?.length > 0 && (
                              <div className="mb-3">
                                <p className="text-[9px] text-[#52525b] uppercase tracking-wider mb-1.5">Top priorities</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {f.priorities.map(p => (
                                    <span key={p} className="px-2 py-1 text-[11px] rounded-md bg-[#06b6d4]/8 text-[#06b6d4] border border-[#06b6d4]/15">
                                      {PRIORITY_LABELS[p]}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {f.suggestions?.trim() && (
                              <div className="p-3 bg-[#18181b] rounded-lg border-l-2 mb-3" style={{ borderColor: '#f59e0b' }}>
                                <p className="text-[9px] text-[#f59e0b] mb-1.5 uppercase tracking-widest font-semibold">💬 Comment</p>
                                <p className="text-[12px] text-[#d4d4d8] leading-relaxed">{f.suggestions}</p>
                              </div>
                            )}
                            <div className="flex justify-between items-center pt-2 border-t border-[#27272a]">
                              <button onClick={() => copyResponse(f)}
                                className="flex items-center gap-1.5 text-[11px] text-[#52525b] hover:text-[#a1a1aa] transition-colors">
                                {copyResponseDone === f._id ? (
                                  <><svg className="w-3.5 h-3.5 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Copied!</>
                                ) : (
                                  <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy response</>
                                )}
                              </button>
                              <button onClick={() => handleDelete(f._id)}
                                className="flex items-center gap-1.5 text-[11px] text-[#ef4444] hover:text-[#f87171] transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#27272a] bg-[#0d0d0f]">
                  <button
                    onClick={() => { setPage(p => Math.max(1, p - 1)); setExpanded(null); setSelected(new Set()); }}
                    disabled={page === 1}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-[#27272a] hover:bg-[#3f3f46] rounded-lg text-[#a1a1aa] disabled:opacity-40 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                    Prev
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const n = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                      return (
                        <button key={n} onClick={() => { setPage(n); setExpanded(null); setSelected(new Set()); }}
                          className={`w-7 h-7 text-[12px] rounded-lg transition-colors ${n === page ? 'bg-[#3b82f6] text-white font-semibold' : 'bg-[#27272a] text-[#a1a1aa] hover:bg-[#3f3f46]'}`}>
                          {n}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => { setPage(p => Math.min(totalPages, p + 1)); setExpanded(null); setSelected(new Set()); }}
                    disabled={page === totalPages}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-[#27272a] hover:bg-[#3f3f46] rounded-lg text-[#a1a1aa] disabled:opacity-40 transition-colors"
                  >
                    Next
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                  </button>
                </div>
              )}
            </div>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  );
}
