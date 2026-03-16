import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import Breadcrumb from '../components/layout/Breadcrumb';
import api from '../api/api';
import { exportLogsData } from '../utils/activityLog';

// ── Colour maps ───────────────────────────────────────────────────────────
const CATEGORY_STYLE = {
  AUTH:      { bg: 'bg-[#3b82f6]/10', text: 'text-[#3b82f6]',  dot: '#3b82f6'  },
  TICKET:    { bg: 'bg-[#22c55e]/10', text: 'text-[#22c55e]',  dot: '#22c55e'  },
  COMMENT:   { bg: 'bg-[#f59e0b]/10', text: 'text-[#f59e0b]',  dot: '#f59e0b'  },
  USER_MGMT: { bg: 'bg-[#a855f7]/10', text: 'text-[#a855f7]',  dot: '#a855f7'  },
  SETTINGS:  { bg: 'bg-[#06b6d4]/10', text: 'text-[#06b6d4]',  dot: '#06b6d4'  },
  ADMIN:     { bg: 'bg-[#ef4444]/10', text: 'text-[#ef4444]',  dot: '#ef4444'  },
  SYSTEM:    { bg: 'bg-[#52525b]/10', text: 'text-[#a1a1aa]',  dot: '#71717a'  },
};

const SEVERITY_STYLE = {
  info:     'bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20',
  warning:  'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20',
  error:    'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20',
  critical: 'bg-[#dc2626]/15 text-[#f87171] border border-[#dc2626]/30',
};

const SEVERITY_ROW = {
  info:     '',
  warning:  'bg-[#f59e0b]/[0.03]',
  error:    'bg-[#ef4444]/[0.04]',
  critical: 'bg-[#dc2626]/[0.06]',
};

const CATEGORIES = ['ALL', 'AUTH', 'TICKET', 'COMMENT', 'USER_MGMT', 'SETTINGS', 'ADMIN', 'SYSTEM'];
const SEVERITIES = ['ALL', 'info', 'warning', 'error', 'critical'];
const PAGE_SIZE  = 25;
const formatTs = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
};

const relativeTime = (iso) => {
  const diff = Date.now() - new Date(iso);
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const actionLabel = (action) =>
  action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// ── MetaRow — key/value pair inside expanded detail panel ─────────────────
const MetaRow = ({ label, value }) => {
  if (value === undefined || value === null || value === '') return null;
  const display = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
  return (
    <div className="flex gap-3 text-[12px]">
      <span className="text-[#52525b] flex-shrink-0 w-32">{label}</span>
      <span className="text-[#a1a1aa] font-['JetBrains_Mono'] break-all">{display}</span>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────
export default function ActivityLog() {
  const navigate = useNavigate();

  const [logs, setLogs]             = useState([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats]           = useState({ total: 0, critical: 0, error: 0, warning: 0, auth: 0, ticket: 0 });
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('ALL');
  const [sevFilter, setSevFilter]   = useState('ALL');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [page, setPage]             = useState(1);
  const [expanded, setExpanded]     = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);

  // ── Fetch from API ────────────────────────────────────────────────────
  const fetchLogs = useCallback(async (pg = page) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page:  pg,
        limit: PAGE_SIZE,
        ...(catFilter !== 'ALL' && { category: catFilter }),
        ...(sevFilter !== 'ALL' && { severity: sevFilter }),
        ...(search    && { search }),
        ...(dateFrom  && { dateFrom }),
        ...(dateTo    && { dateTo }),
      });
      const { data } = await api.get(`/logs?${params}`);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.pages || 1);
      setStats(data.stats || { total: 0, critical: 0, error: 0, warning: 0, auth: 0, ticket: 0 });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [page, catFilter, sevFilter, search, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(page); }, [page]);

  // Reset to page 1 and refetch when filters change
  useEffect(() => {
    if (page !== 1) { setPage(1); } else { fetchLogs(1); }
    setExpanded(null);
  }, [catFilter, sevFilter, dateFrom, dateTo]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      if (page !== 1) { setPage(1); } else { fetchLogs(1); }
      setExpanded(null);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);


  const handleClear = async () => {
    try {
      await api.delete('/logs');
      setLogs([]);
      setTotal(0);
      setStats({ total: 0, critical: 0, error: 0, warning: 0, auth: 0, ticket: 0 });
    } catch {
      setError('Failed to clear logs');
    }
    setConfirmClear(false);
  };

  const handleExport = () => {
    exportLogsData(logs);
  };

  const toggle = (id) => setExpanded(prev => prev === id ? null : id);

  return (
    <PageWrapper>
      <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-5 overflow-x-hidden">
        <Breadcrumb />

        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 p-5 rounded-2xl bg-gradient-to-r from-[#ef4444]/8 via-[#f97316]/4 to-transparent border border-[#ef4444]/15">
          <div>
            <h1 className="text-[22px] sm:text-[24px] font-bold text-[#fafafa] mb-0.5">Activity Log</h1>
            <p className="text-[13px] text-[#a1a1aa]">{stats.total} events recorded · admin access only</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#27272a] hover:bg-[#3f3f46] text-[#fafafa] text-[12px] font-medium rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Export JSON
            </button>
            <button
              onClick={() => setConfirmClear(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] text-[12px] font-medium rounded-lg border border-[#ef4444]/20 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              Clear All
            </button>
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-1.5 text-[12px] text-[#a1a1aa] hover:text-white transition-colors px-2 py-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
              Back
            </button>
          </div>
        </div>

        {/* ── Stat chips ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3 mb-5">
          {[
            { label: 'Total',    value: stats.total,    color: '#a1a1aa' },
            { label: 'Critical', value: stats.critical, color: '#ef4444' },
            { label: 'Errors',   value: stats.error,    color: '#f97316' },
            { label: 'Warnings', value: stats.warning,  color: '#f59e0b' },
            { label: 'Auth',     value: stats.auth,     color: '#3b82f6' },
            { label: 'Tickets',  value: stats.ticket,   color: '#22c55e' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#18181b] border border-[#27272a] rounded-xl p-3 text-center">
              <div className="text-[20px] sm:text-[24px] font-bold leading-none mb-1" style={{ color }}>{value}</div>
              <div className="text-[10px] text-[#52525b]">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Filters ────────────────────────────────────────────────── */}
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 mb-4">
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[160px]">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#52525b]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search action, user, detail…"
                className="w-full pl-8 pr-3 py-2 bg-[#09090b] border border-[#27272a] rounded-lg text-[12.5px] text-[#fafafa] placeholder-[#3f3f46] focus:outline-none focus:border-[#3b82f6]"
              />
            </div>

            {/* Category */}
            <select
              value={catFilter}
              onChange={e => setCatFilter(e.target.value)}
              className="px-3 py-2 bg-[#09090b] border border-[#27272a] rounded-lg text-[12.5px] text-[#a1a1aa] focus:outline-none focus:border-[#3b82f6]"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : c.replace('_', ' ')}</option>)}
            </select>

            {/* Severity */}
            <select
              value={sevFilter}
              onChange={e => setSevFilter(e.target.value)}
              className="px-3 py-2 bg-[#09090b] border border-[#27272a] rounded-lg text-[12.5px] text-[#a1a1aa] focus:outline-none focus:border-[#3b82f6]"
            >
              {SEVERITIES.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Severities' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>

            {/* Date from */}
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 bg-[#09090b] border border-[#27272a] rounded-lg text-[12.5px] text-[#a1a1aa] focus:outline-none focus:border-[#3b82f6]"
            />
            {/* Date to */}
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 bg-[#09090b] border border-[#27272a] rounded-lg text-[12.5px] text-[#a1a1aa] focus:outline-none focus:border-[#3b82f6]"
            />

            {/* Clear filters */}
            {(search || catFilter !== 'ALL' || sevFilter !== 'ALL' || dateFrom || dateTo) && (
              <button
                onClick={() => { setSearch(''); setCatFilter('ALL'); setSevFilter('ALL'); setDateFrom(''); setDateTo(''); }}
                className="px-3 py-2 text-[12px] text-[#52525b] hover:text-[#a1a1aa] transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
          <p className="mt-2 text-[11px] text-[#3f3f46]">{total} result{total !== 1 ? 's' : ''} · page {page} of {totalPages}</p>
        </div>

        {/* ── Error ─────────────────────────────────────────────────── */}
        {error && (
          <div className="mb-4 p-3 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg text-[#ef4444] text-[13px]">{error}</div>
        )}

        {/* ── Loading skeleton ───────────────────────────────────────── */}
        {loading ? (
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-[#27272a] last:border-0">
                <div className="skeleton h-3 w-32 rounded" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3.5 w-48 rounded" />
                  <div className="skeleton h-3 w-64 rounded" />
                </div>
                <div className="skeleton h-5 w-16 rounded-full" />
                <div className="skeleton h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-12 text-center">
            <div className="w-12 h-12 bg-[#27272a] rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[#52525b]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
            <p className="text-[12px] text-[#52525b]">Events will appear here as users interact with the platform.</p>
          </div>
        ) : (
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden">
            {/* Desktop header */}
            <div className="hidden sm:grid grid-cols-[160px_1fr_100px_110px_80px_32px] gap-3 px-4 py-2.5 border-b border-[#27272a] bg-[#09090b]">
              {['Timestamp', 'Action / Detail', 'Actor', 'Category', 'Severity', ''].map((h) => (
                <span key={h} className="text-[10px] font-semibold text-[#52525b] uppercase tracking-wider">{h}</span>
              ))}
            </div>

            <div className="divide-y divide-[#27272a]">
              {logs.map((entry) => {
                const cat = CATEGORY_STYLE[entry.category] || CATEGORY_STYLE.SYSTEM;
                const entryId = entry._id || entry.id;
                const isOpen = expanded === entryId;
                return (
                  <div key={entryId}>
                    {/* ── Row ── */}
                    <button
                      onClick={() => toggle(entryId)}
                      className={`w-full text-left transition-colors hover:bg-[#27272a]/40 ${SEVERITY_ROW[entry.severity] || ''}`}
                    >
                      {/* Mobile layout */}
                      <div className="sm:hidden px-4 py-3 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1`} style={{ backgroundColor: cat.dot }} />
                            <span className="text-[12px] font-medium text-[#fafafa]">{actionLabel(entry.action)}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${SEVERITY_STYLE[entry.severity]}`}>
                              {entry.severity}
                            </span>
                          </div>
                          <svg className={`w-3.5 h-3.5 text-[#52525b] flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                        </div>
                        <p className="text-[11px] text-[#a1a1aa] truncate pl-3.5">{entry.detail || '—'}</p>
                        <div className="flex items-center gap-3 pl-3.5">
                          <span className="text-[10px] text-[#52525b]">{entry.actor?.email}</span>
                          <span className="text-[10px] text-[#3f3f46]">{relativeTime(entry.createdAt || entry.timestamp)}</span>
                        </div>
                      </div>

                      {/* Desktop layout */}
                      <div className="hidden sm:grid grid-cols-[160px_1fr_100px_110px_80px_32px] gap-3 px-4 py-3 items-center">
                        {/* Timestamp */}
                        <div className="min-w-0">
                          <p className="text-[11px] font-['JetBrains_Mono'] text-[#52525b] leading-tight">{formatTs(entry.createdAt || entry.timestamp)}</p>
                          <p className="text-[10px] text-[#3f3f46] mt-0.5">{relativeTime(entry.createdAt || entry.timestamp)}</p>
                        </div>
                        {/* Action + detail */}
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium text-[#fafafa] truncate">{actionLabel(entry.action)}</p>
                          <p className="text-[11px] text-[#71717a] truncate mt-0.5">{entry.detail || '—'}</p>
                        </div>
                        {/* Actor */}
                        <div className="min-w-0">
                          <p className="text-[11px] text-[#a1a1aa] truncate">{entry.actor?.name || '—'}</p>
                          <p className="text-[10px] text-[#52525b] truncate">{entry.actor?.role}</p>
                        </div>
                        {/* Category */}
                        <div>
                          <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium ${cat.bg} ${cat.text}`}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.dot }} />
                            {entry.category.replace('_', ' ')}
                          </span>
                        </div>
                        {/* Severity */}
                        <div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${SEVERITY_STYLE[entry.severity]}`}>
                            {entry.severity}
                          </span>
                        </div>
                        {/* Chevron */}
                        <svg className={`w-3.5 h-3.5 text-[#52525b] transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                      </div>
                    </button>

                    {/* ── Expanded detail panel ── */}
                    {isOpen && (
                      <div className="px-4 sm:px-6 pb-4 pt-1 bg-[#09090b] border-t border-[#27272a] space-y-3">
                        <p className="text-[11px] font-semibold text-[#52525b] uppercase tracking-widest pt-2">Event Details</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5">
                          <MetaRow label="Log ID"       value={entryId} />
                          <MetaRow label="Timestamp"    value={formatTs(entry.createdAt || entry.timestamp)} />
                          <MetaRow label="Action"       value={entry.action} />
                          <MetaRow label="Category"     value={entry.category} />
                          <MetaRow label="Severity"     value={entry.severity} />
                          <MetaRow label="Detail"       value={entry.detail} />
                          <MetaRow label="Actor ID"     value={entry.actor?.id} />
                          <MetaRow label="Actor Name"   value={entry.actor?.name} />
                          <MetaRow label="Actor Email"  value={entry.actor?.email} />
                          <MetaRow label="Actor Role"   value={entry.actor?.role} />
                          <MetaRow label="IP Address"   value={entry.ip} />
                          <MetaRow label="Session ID"   value={entry.sessionId} />
                        </div>

                        {Object.keys(entry.metadata || {}).length > 0 && (
                          <>
                            <p className="text-[11px] font-semibold text-[#52525b] uppercase tracking-widest pt-1">Payload / Metadata</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5">
                              {Object.entries(entry.metadata).map(([k, v]) => (
                                <MetaRow key={k} label={k} value={v} />
                              ))}
                            </div>
                          </>
                        )}

                        <details className="pt-1">
                          <summary className="text-[11px] text-[#3f3f46] cursor-pointer hover:text-[#52525b] select-none">User Agent</summary>
                          <p className="text-[10px] font-['JetBrains_Mono'] text-[#3f3f46] mt-1 break-all">{entry.userAgent}</p>
                        </details>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Pagination ─────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
            <p className="text-[12px] text-[#52525b]">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 flex-shrink-0 rounded-lg text-[12px] bg-[#18181b] border border-[#27272a] text-[#a1a1aa] hover:bg-[#27272a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >← Prev</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const pg = totalPages <= 7 ? i + 1 : (page <= 4 ? i + 1 : page - 3 + i);
                if (pg < 1 || pg > totalPages) return null;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`w-9 h-8 flex-shrink-0 rounded-lg text-[12px] border transition-colors ${
                      pg === page
                        ? 'bg-[#3b82f6] border-[#3b82f6] text-white font-medium'
                        : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:bg-[#27272a]'
                    }`}
                  >{pg}</button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 flex-shrink-0 rounded-lg text-[12px] bg-[#18181b] border border-[#27272a] text-[#a1a1aa] hover:bg-[#27272a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >Next →</button>
            </div>
          </div>
        )}

        {/* ── Clear confirmation modal ────────────────────────────────── */}
        {confirmClear && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
              <div className="w-11 h-11 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-5 h-5 text-[#ef4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </div>
              <h3 className="text-[16px] font-semibold text-[#fafafa] mb-2">Clear all logs?</h3>
              <p className="text-[13px] text-[#a1a1aa] mb-6">
                this will permanently delete all {stats.total} log entries.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmClear(false)}
                  className="flex-1 py-2.5 rounded-lg bg-[#27272a] text-[#fafafa] text-[13px] font-medium hover:bg-[#3f3f46] transition-colors"
                >Cancel</button>
                <button
                  onClick={handleClear}
                  className="flex-1 py-2.5 rounded-lg bg-[#ef4444] text-white text-[13px] font-medium hover:bg-[#dc2626] transition-colors"
                >Delete All</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
