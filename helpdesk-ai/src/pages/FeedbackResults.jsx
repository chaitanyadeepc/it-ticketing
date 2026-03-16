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

// ── Stat bar ───────────────────────────────────────────────────────────────
const StatBar = ({ label, count, total, color = '#3b82f6' }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-[12px] text-[#a1a1aa] flex-shrink-0 w-40 truncate">{label}</span>
      <div className="flex-1 h-2 bg-[#27272a] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
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

// ── Satisfaction summary ───────────────────────────────────────────────────
const SatSummary = ({ dist, total, avg }) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[32px] font-black" style={{ color: avg >= 4 ? '#22c55e' : avg >= 3 ? '#f59e0b' : '#ef4444' }}>
        {avg}
      </span>
      <div>
        <div className="flex gap-0.5">
          {[1,2,3,4,5].map(n => (
            <svg key={n} className="w-3.5 h-3.5" viewBox="0 0 20 20" fill={n <= Math.round(avg) ? '#f59e0b' : '#27272a'}>
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        <p className="text-[10px] text-[#52525b]">out of 5 · {total} responses</p>
      </div>
    </div>
    {[5,4,3,2,1].map(n => (
      <StatBar key={n} label={`${n} star — ${SAT_LABELS[n-1]}`} count={dist?.[n] || 0} total={total} color={SAT_COLORS[n-1]} />
    ))}
  </div>
);

export default function FeedbackResults() {
  const navigate = useNavigate();
  const [stats, setStats]               = useState(null);
  const [feedback, setFeedback]         = useState([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [error, setError]               = useState('');
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [expanded, setExpanded]         = useState(null);
  const [search, setSearch]             = useState('');
  const [lastUpdated, setLastUpdated]   = useState(null);
  const [copyDone, setCopyDone]         = useState(false);
  const intervalRef                     = useRef(null);

  const fetchAll = useCallback(async (pg = 1, silent = false) => {
    if (!silent) pg === 1 ? setLoading(true) : setRefreshing(true);
    else setRefreshing(true);
    setError('');
    try {
      const [sr, lr] = await Promise.all([
        api.get('/feedback/stats'),
        api.get(`/feedback?page=${pg}&limit=15`),
      ]);
      setStats(sr.data);
      setFeedback(lr.data.feedback || []);
      setTotal(lr.data.total || 0);
      setTotalPages(lr.data.pages || 1);
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
      setTotal(t => t - 1);
      if (stats) setStats(s => ({ ...s, total: s.total - 1 }));
      setExpanded(null);
    } catch {
      setError('Failed to delete response');
    }
  };

  const exportCSV = () => {
    if (!feedback.length) return;
    const headers = ['Date', 'Role', 'Current Process', 'Satisfaction', 'Priorities', 'Would Use Chatbot', 'Issue Frequency', 'Response Time Expectation', 'Notif. Preference', 'Status Importance', 'Suggestions'];
      const rows = feedback.map((f) => [
        new Date(f.createdAt).toLocaleDateString('en-GB'),
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

  const filteredFeedback = search.trim()
    ? feedback.filter(f =>
        ROLE_LABELS[f.role]?.toLowerCase().includes(search.toLowerCase()) ||
        (f.suggestions || '').toLowerCase().includes(search.toLowerCase())
      )
    : feedback;

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
            <h1 className="text-[22px] sm:text-[24px] font-bold text-[#fafafa] mb-1">Survey Results</h1>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_,i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
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

            {/* ── Summary stat chips ──────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              {[
                { label: 'Total Responses',  value: stats.total,                        color: '#3b82f6', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                { label: 'Avg Satisfaction', value: `${stats.avgSatisfaction}/5`,        color: '#f59e0b', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
                { label: 'Want AI Chatbot',  value: `${positiveIntent}%`,                color: '#22c55e', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2' },
                { label: 'Top Respondent',   value: ROLE_LABELS[topRole] || '—',          color: '#a855f7', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
                { label: 'Top Priority',     value: PRIORITY_LABELS[topPriority] || '—',  color: '#06b6d4', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
                { label: 'Top Process Now',  value: PROCESS_LABELS[topProcess] || '—',   color: '#f97316', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
              ].map(({ label, value, color, icon }) => (
                <div key={label} className="bg-[#18181b] border border-[#27272a] rounded-xl p-4">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: `${color}18` }}>
                    <svg className="w-3.5 h-3.5" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                    </svg>
                  </div>
                  <div className="text-[20px] sm:text-[22px] font-bold leading-tight mb-0.5 truncate" style={{ color }}>{value}</div>
                  <div className="text-[10px] text-[#52525b] leading-tight">{label}</div>
                </div>
              ))}
            </div>

            {/* ── Charts grid ─────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

              <SCard
                title="Satisfaction Distribution"
                subtitle="How users rated their current IT support experience"
                accent="#f59e0b"
                icon="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              >
                <SatSummary dist={stats.satisfactionDist} total={stats.total} avg={stats.avgSatisfaction} />
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

            </div>

            {/* ── Individual Responses ─────────────────────────────────── */}
            <div className="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#27272a] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-[13px] font-semibold text-[#fafafa]">Individual Responses</h2>
                  <p className="text-[11px] text-[#52525b] mt-0.5">
                    {total} total · {totalPages > 1 ? `page ${page} of ${totalPages}` : 'all shown'}
                  </p>
                </div>
                <div className="relative">
                  <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#52525b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
                  </svg>
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by role or suggestion…"
                    className="pl-8 pr-3 py-1.5 bg-[#09090b] border border-[#27272a] rounded-lg text-[12px] text-[#fafafa] placeholder-[#3f3f46] focus:outline-none focus:border-[#3b82f6] w-52 transition-colors"
                  />
                </div>
              </div>

              {filteredFeedback.length === 0 ? (
                <div className="p-10 text-center text-[13px] text-[#52525b]">
                  {search ? 'No responses match your search.' : 'No responses on this page.'}
                </div>
              ) : (
                <div className="divide-y divide-[#27272a]">
                  {filteredFeedback.map((f, idx) => (
                    <div key={f._id} className="px-5 py-4 hover:bg-[#1c1c1f] transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-mono text-[#3f3f46] flex-shrink-0">
                            #{(page - 1) * 15 + idx + 1}
                          </span>
                          <span className="text-[10px] font-mono text-[#3f3f46]">
                            {new Date(f.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] rounded-full bg-[#8b5cf6]/10 text-[#a78bfa] font-medium">
                            {ROLE_LABELS[f.role] || f.role}
                          </span>
                          <div className="flex items-center gap-0.5">
                            {[1,2,3,4,5].map(n => (
                              <svg key={n} className="w-3 h-3" viewBox="0 0 20 20" fill={n <= f.satisfaction ? '#f59e0b' : '#27272a'}>
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                            <span className="text-[10px] text-[#52525b] ml-1">{f.satisfaction}/5</span>
                          </div>
                          <span className={`px-2 py-0.5 text-[10px] rounded-full font-medium ${
                            ['definitely','probably'].includes(f.wouldUseChatbot)
                              ? 'bg-[#22c55e]/10 text-[#22c55e]'
                              : 'bg-[#27272a] text-[#71717a]'
                          }`}>
                            AI: {CHATBOT_LABELS[f.wouldUseChatbot]}
                          </span>
                        </div>
                        <button
                          onClick={() => setExpanded(expanded === f._id ? null : f._id)}
                          className="flex items-center gap-1 text-[11px] text-[#52525b] hover:text-[#a1a1aa] transition-colors flex-shrink-0"
                        >
                          <svg className={`w-3.5 h-3.5 transition-transform ${expanded === f._id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                          {expanded === f._id ? 'Less' : 'Details'}
                        </button>
                      </div>

                      {expanded === f._id && (
                        <div className="mt-4 pt-4 border-t border-[#27272a]">
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                            {[
                              { label: 'Current process',       value: PROCESS_LABELS[f.currentProcess] },
                              { label: 'Issue frequency',        value: FREQ_LABELS[f.issueFrequency] },
                              { label: 'Status importance',      value: IMP_LABELS[f.statusImportance] },
                              ...(f.responseTime    ? [{ label: 'Response expectation', value: RESP_TIME_LABELS[f.responseTime] }] : []),
                              ...(f.notifPreference ? [{ label: 'Notif. preference',    value: NOTIF_LABELS[f.notifPreference] }] : []),
                            ].map(({ label, value }) => value ? (
                              <div key={label} className="bg-[#09090b] rounded-lg px-3 py-2">
                                <p className="text-[10px] text-[#52525b] mb-0.5 uppercase tracking-wider">{label}</p>
                                <p className="text-[12px] text-[#a1a1aa] font-medium">{value}</p>
                              </div>
                            ) : null)}
                          </div>
                          {f.priorities?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {f.priorities.map(p => (
                                <span key={p} className="px-2 py-1 text-[11px] rounded-md bg-[#06b6d4]/8 text-[#06b6d4] border border-[#06b6d4]/15">
                                  {PRIORITY_LABELS[p]}
                                </span>
                              ))}
                            </div>
                          )}
                          {f.suggestions && (
                            <div className="p-3 bg-[#09090b] rounded-lg border border-[#27272a] mb-3">
                              <p className="text-[10px] text-[#52525b] mb-1 uppercase tracking-widest">Suggestion</p>
                              <p className="text-[12px] text-[#a1a1aa] leading-relaxed">{f.suggestions}</p>
                            </div>
                          )}
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleDelete(f._id)}
                              className="flex items-center gap-1.5 text-[11px] text-[#ef4444] hover:text-[#f87171] transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#27272a] bg-[#0d0d0f]">
                  <button
                    onClick={() => { setPage(p => Math.max(1, p - 1)); setExpanded(null); }}
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
                        <button
                          key={n}
                          onClick={() => { setPage(n); setExpanded(null); }}
                          className={`w-7 h-7 text-[12px] rounded-lg transition-colors ${n === page ? 'bg-[#3b82f6] text-white font-semibold' : 'bg-[#27272a] text-[#a1a1aa] hover:bg-[#3f3f46]'}`}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => { setPage(p => Math.min(totalPages, p + 1)); setExpanded(null); }}
                    disabled={page === totalPages}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-[#27272a] hover:bg-[#3f3f46] rounded-lg text-[#a1a1aa] disabled:opacity-40 transition-colors"
                  >
                    Next
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </PageWrapper>
  );
}
