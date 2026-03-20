import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import Breadcrumb from '../components/layout/Breadcrumb';
import Button from '../components/ui/Button';
import LogoMark from '../components/ui/LogoMark';
import api from '../api/api';

const PRIORITY_COLOR = { Low: '#3b82f6', Medium: '#f59e0b', High: '#f97316', Critical: '#ef4444' };
const STATUS_COLOR   = { Open: '#22c55e', 'In Progress': '#f59e0b', Resolved: '#3b82f6', Closed: '#52525b' };
const STATUS_BG      = { Open: 'bg-[#22c55e]/10 text-[#22c55e]', 'In Progress': 'bg-[#f59e0b]/10 text-[#f59e0b]', Resolved: 'bg-[#3b82f6]/10 text-[#3b82f6]', Closed: 'bg-[#52525b]/10 text-[#a1a1aa]' };

const Home = () => {
  const navigate = useNavigate();
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  const userName = localStorage.getItem('userName') || '';
  const userRole = localStorage.getItem('userRole') || 'user';
  const userEmail = localStorage.getItem('userEmail') || '';
  const firstName = userName.split(' ')[0] || userEmail.split('@')[0] || 'there';
  const isAdmin = userRole === 'admin';

  const [tickets, setTickets] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    setStatsLoading(true);
    api.get('/tickets')
      .then(({ data }) => setTickets(data.tickets || []))
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, [isAuthenticated]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const total      = tickets.length;
  const open       = tickets.filter((t) => t.status === 'Open').length;
  const inProgress = tickets.filter((t) => t.status === 'In Progress').length;
  const resolved   = tickets.filter((t) => t.status === 'Resolved').length;
  const closed     = tickets.filter((t) => t.status === 'Closed').length;
  const critical   = tickets.filter((t) => t.priority === 'Critical').length;
  const unresolved = open + inProgress;

  // Category breakdown (top 4)
  const categoryMap = tickets.reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + 1; return acc; }, {});
  const topCategories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).slice(0, 4);

  // Recent activity (last 5 tickets)
  const recent = tickets.slice(0, 5);

  // Resolution rate
  const resolutionRate = total > 0 ? Math.round(((resolved + closed) / total) * 100) : 0;

  // Overdue tickets — open/in-progress past their due date
  const today = new Date(); today.setHours(0,0,0,0);
  const overdueTickets = tickets.filter(t =>
    (t.status === 'Open' || t.status === 'In Progress') &&
    t.dueDate && new Date(t.dueDate) < today
  );

  // ── Greeting time ──────────────────────────────────────────────────────────
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (isAuthenticated) {
    const kpiItems = [
      { label: 'Open', value: open, color: '#22c55e', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', delta: null },
      { label: 'In Progress', value: inProgress, color: '#f59e0b', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', delta: null },
      { label: 'Resolved', value: resolved + closed, color: '#3b82f6', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', delta: null },
      { label: 'Critical', value: critical, color: '#ef4444', icon: 'M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', delta: null },
      { label: 'Resolution', value: `${resolutionRate}%`, color: '#8b5cf6', icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z', delta: null },
      { label: 'Total Tickets', value: total, color: '#06b6d4', icon: 'M3 10h18M3 6h18M3 14h18M3 18h18', delta: null },
    ];
    return (
      <PageWrapper>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-5 overflow-x-hidden">
          <Breadcrumb items={[{ label: 'Home' }]} />

          {/* ── Command Center Header ─────────────────────────────── */}
          <div className="mb-6 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#3b82f6]/8 via-[#6366f1]/4 to-transparent border border-[#3b82f6]/15">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[12px] font-medium uppercase tracking-widest text-[#3b82f6]/70 mb-1">{greeting}</p>
                <h1 className="text-[26px] sm:text-[30px] font-black text-[#fafafa] leading-tight">{firstName}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  {isAdmin && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#f59e0b] text-[11px] font-semibold">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      Administrator
                    </span>
                  )}
                  {userRole === 'agent' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#6366f1]/10 border border-[#6366f1]/20 text-[#818cf8] text-[11px] font-semibold">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                      Agent
                    </span>
                  )}
                  {!statsLoading && total > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#27272a] text-[#71717a] text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                      {total} ticket{total !== 1 ? 's' : ''} total
                    </span>
                  )}
                </div>
              </div>
              {/* Primary action */}
              <button
                onClick={() => navigate('/chatbot')}
                className="self-start sm:self-center flex items-center gap-2.5 px-5 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-semibold rounded-xl transition-colors shadow-lg shadow-[#3b82f6]/20 flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                New Ticket
              </button>
            </div>
          </div>

          {/* ── KPI Ribbon ── */}
          {statsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-[#27272a] bg-[#18181b] p-4 space-y-2">
                  <div className="skeleton h-7 w-10 rounded" />
                  <div className="skeleton h-3 w-16 rounded" />
                </div>
              ))}
            </div>
          ) : total === 0 ? null : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              {kpiItems.map(({ label, value, color, icon }) => (
                <div
                  key={label}
                  className="rounded-xl border p-3.5 relative overflow-hidden group cursor-default"
                  style={{ borderColor: `${color}28`, background: `linear-gradient(135deg, ${color}0d 0%, transparent 60%)` }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}18` }}>
                      <svg className="w-3.5 h-3.5" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                      </svg>
                    </div>
                  </div>
                  <div className="text-[22px] font-black leading-none mb-1" style={{ color }}>{value}</div>
                  <div className="text-[11px] text-[#71717a] font-medium">{label}</div>
                  <div className="absolute -right-3 -bottom-3 w-12 h-12 rounded-full blur-2xl opacity-20 transition-opacity group-hover:opacity-40" style={{ backgroundColor: color }} />
                </div>
              ))}
            </div>
          )}

          {/* ── Empty state ────────────────────────────────────────── */}
          {!statsLoading && total === 0 && (
            <div className="flex flex-col items-center justify-center py-20 bg-[#18181b] border border-[#27272a] rounded-2xl text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3b82f6]/20 to-[#6366f1]/20 border border-[#3b82f6]/20 flex items-center justify-center mb-5">
                <svg className="w-8 h-8 text-[#3b82f6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
              </div>
              <h2 className="text-[18px] font-bold text-[#fafafa] mb-2">No tickets yet</h2>
              <p className="text-[13px] text-[#52525b] mb-6 max-w-xs leading-relaxed">Use the AI chatbot to raise your first support request. It takes under 30 seconds.</p>
              <Button variant="primary" onClick={() => navigate('/chatbot')}>
                <svg className="w-4 h-4 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                Raise a Ticket
              </Button>
            </div>
          )}

          {!statsLoading && total > 0 && (
            <>
              {/* ── Overdue alert ── */}
              {overdueTickets.length > 0 && (
                <button
                  onClick={() => navigate('/my-tickets/calendar')}
                  className="w-full flex items-center gap-3 mb-6 p-3.5 rounded-xl bg-[#ef4444]/8 border border-[#ef4444]/25 hover:border-[#ef4444]/50 transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#ef4444]/15 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-[#ef4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#ef4444]">
                      {overdueTickets.length} overdue ticket{overdueTickets.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-[11px] text-[#a1a1aa]">Past their due date — view calendar for details</p>
                  </div>
                  <svg className="w-4 h-4 text-[#ef4444]/60 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}

              {/* ── Quick nav tiles ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'AI Chatbot', sub: 'Raise a ticket', path: '/chatbot', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', color: '#3b82f6' },
                  { label: 'My Tickets', sub: isAdmin ? 'Admin dashboard' : 'View all', path: isAdmin ? '/admin' : '/my-tickets', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', color: '#22c55e' },
                  { label: 'Calendar', sub: 'Due dates', path: '/my-tickets/calendar', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', color: '#f59e0b' },
                  (isAdmin || userRole === 'agent')
                    ? { label: 'Reports', sub: 'Analytics', path: '/reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: '#8b5cf6' }
                    : { label: 'Notifications', sub: 'Alerts', path: '/notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', color: '#06b6d4' },
                ].map(({ label, sub, path, icon, color }) => (
                  <button
                    key={label}
                    onClick={() => navigate(path)}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-[#18181b] border border-[#27272a] hover:border-[#3f3f46] hover:bg-[#1c1c1f] transition-all text-left group"
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110" style={{ backgroundColor: `${color}18` }}>
                      <svg className="w-4 h-4" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold text-[#fafafa] leading-tight">{label}</p>
                      <p className="text-[11px] text-[#52525b] leading-tight">{sub}</p>
                    </div>
                    <svg className="w-3.5 h-3.5 text-[#3f3f46] group-hover:text-[#52525b] ml-auto flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>

              {/* ── Main content grid ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* LEFT — activity feed + overview */}
                <div className="lg:col-span-2 space-y-5">

                  {/* Ticket timeline */}
                  <div className="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272a]">
                      <div>
                        <h2 className="text-[14px] font-semibold text-[#fafafa]">Recent Tickets</h2>
                        <p className="text-[11px] text-[#52525b] mt-0.5">Latest activity across your tickets</p>
                      </div>
                      <button
                        onClick={() => navigate(isAdmin ? '/admin' : '/my-tickets')}
                        className="flex items-center gap-1.5 text-[12px] text-[#3b82f6] hover:text-[#60a5fa] transition-colors font-medium"
                      >
                        View all
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                    <div className="divide-y divide-[#27272a]">
                      {recent.map((t) => (
                        <button
                          key={t._id}
                          onClick={() => navigate(`/tickets/${t._id}`)}
                          className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-[#27272a]/40 transition-colors text-left group"
                        >
                          <div className="w-2 h-2 rounded-full flex-shrink-0 mt-[1px]" style={{ backgroundColor: STATUS_COLOR[t.status] || '#52525b' }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-[#fafafa] truncate font-medium">{t.title}</p>
                            <p className="text-[11px] text-[#52525b] mt-0.5 truncate">{t.category || 'General'} · {t.priority || 'Medium'}</p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 whitespace-nowrap ${STATUS_BG[t.status] || 'bg-[#27272a] text-[#a1a1aa]'}`}>{t.status}</span>
                          {t.ticketId && (
                            <span className="hidden sm:block text-[10px] font-['JetBrains_Mono'] text-[#3f3f46] group-hover:text-[#71717a] transition-colors flex-shrink-0">{t.ticketId}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Status breakdown + ring */}
                  <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h2 className="text-[14px] font-semibold text-[#fafafa]">Ticket Overview</h2>
                        <p className="text-[11px] text-[#52525b] mt-0.5">Status distribution across all tickets</p>
                      </div>
                      <span className="text-[11px] font-['JetBrains_Mono'] text-[#52525b] bg-[#27272a] px-2.5 py-1 rounded-lg">{total} total</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-5 sm:gap-8 items-start sm:items-center">
                      {/* Resolution donut */}
                      <div className="relative w-24 h-24 flex-shrink-0">
                        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="14" fill="none" stroke="#1e1e21" strokeWidth="4"/>
                          <circle cx="18" cy="18" r="14" fill="none" stroke="#27272a" strokeWidth="4"/>
                          <circle cx="18" cy="18" r="14" fill="none" stroke="#3b82f6" strokeWidth="4"
                            strokeDasharray={`${resolutionRate * 0.879} ${100 - resolutionRate * 0.879}`}
                            strokeLinecap="round"/>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-[17px] font-black text-[#fafafa]">{resolutionRate}%</span>
                          <span className="text-[9px] text-[#52525b] font-medium tracking-wide">resolved</span>
                        </div>
                      </div>
                      {/* Status bars */}
                      <div className="flex-1 w-full space-y-3">
                        {[
                          { label: 'Open', value: open, color: '#22c55e' },
                          { label: 'In Progress', value: inProgress, color: '#f59e0b' },
                          { label: 'Resolved', value: resolved, color: '#3b82f6' },
                          { label: 'Closed', value: closed, color: '#52525b' },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="flex items-center gap-3">
                            <span className="text-[11.5px] text-[#a1a1aa] w-20 flex-shrink-0">{label}</span>
                            <div className="flex-1 h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: total > 0 ? `${(value / total) * 100}%` : '0%', backgroundColor: color }}
                              />
                            </div>
                            <span className="text-[11px] font-['JetBrains_Mono'] text-[#52525b] w-5 text-right flex-shrink-0">{value}</span>
                          </div>
                        ))}
                        {critical > 0 && (
                          <p className="text-[11.5px] text-[#ef4444] font-medium flex items-center gap-1.5 pt-1">
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            {critical} critical {critical === 1 ? 'issue needs' : 'issues need'} immediate attention
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT — priority + categories + tools */}
                <div className="space-y-5">

                  {/* Priority breakdown */}
                  <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-[14px] font-semibold text-[#fafafa]">By Priority</h2>
                      <span className="text-[10px] text-[#52525b] uppercase tracking-wider font-semibold">count</span>
                    </div>
                    <div className="space-y-3.5">
                      {['Critical', 'High', 'Medium', 'Low'].map((p) => {
                        const count = tickets.filter((t) => t.priority === p).length;
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        return (
                          <div key={p}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PRIORITY_COLOR[p] }} />
                                <span className="text-[12px] text-[#a1a1aa]">{p}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-['JetBrains_Mono'] text-[#52525b]">{pct}%</span>
                                <span className="text-[12px] font-medium text-[#fafafa] w-5 text-right">{count}</span>
                              </div>
                            </div>
                            <div className="h-1 bg-[#27272a] rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: PRIORITY_COLOR[p] }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Top categories */}
                  {topCategories.length > 0 && (
                    <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
                      <h2 className="text-[14px] font-semibold text-[#fafafa] mb-4">Top Categories</h2>
                      <div className="space-y-3">
                        {topCategories.map(([cat, count], idx) => {
                          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                          const catColors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#22c55e'];
                          return (
                            <div key={cat}>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[12px] text-[#a1a1aa] truncate max-w-[65%]">{cat}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-['JetBrains_Mono'] text-[#52525b]">{pct}%</span>
                                  <span className="text-[12px] font-medium text-[#fafafa] w-5 text-right">{count}</span>
                                </div>
                              </div>
                              <div className="h-1 bg-[#27272a] rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: catColors[idx % catColors.length] }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Admin tools */}
                  {isAdmin && (
                    <div className="bg-gradient-to-br from-[#3b82f6]/8 to-[#6366f1]/8 border border-[#3b82f6]/20 rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-6 h-6 rounded-md bg-[#3b82f6]/20 flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-[#3b82f6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <h2 className="text-[13.5px] font-semibold text-[#fafafa]">Admin Tools</h2>
                      </div>
                      <div className="space-y-1.5">
                        {[
                          { label: 'Admin Dashboard', sub: 'Tickets, bulk actions & filters', path: '/admin', color: '#3b82f6' },
                          { label: 'Advanced Reports', sub: 'CSAT, resolution & agent analytics', path: '/reports', color: '#6366f1' },
                          { label: 'Manage Users', sub: 'Roles, activation & permissions', path: '/admin/users', color: '#a855f7' },
                          { label: 'SLA Configuration', sub: 'Set response time targets', path: '/admin/sla-config', color: '#f59e0b' },
                        ].map(({ label, sub, path, color }) => (
                          <button
                            key={path}
                            onClick={() => navigate(path)}
                            className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-[#111113]/60 hover:bg-[#111113] border border-transparent hover:border-[#27272a] transition-all text-left group"
                          >
                            <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-medium text-[#fafafa]">{label}</p>
                              <p className="text-[10.5px] text-[#52525b] truncate">{sub}</p>
                            </div>
                            <svg className="w-3 h-3 text-[#3f3f46] group-hover:text-[#52525b] flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* User CTA */}
                  {!isAdmin && (
                    <div className="bg-gradient-to-br from-[#3b82f6]/8 to-[#6366f1]/8 border border-[#3b82f6]/20 rounded-xl p-5">
                      <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/15 border border-[#3b82f6]/25 flex items-center justify-center mb-3">
                        <svg className="w-5 h-5 text-[#3b82f6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                        </svg>
                      </div>
                      <p className="text-[13.5px] font-semibold text-[#fafafa] mb-1.5">Need more help?</p>
                      <p className="text-[12px] text-[#52525b] mb-4 leading-relaxed">Our AI chatbot guides you through raising a new ticket in under 30 seconds.</p>
                      <button
                        onClick={() => navigate('/chatbot')}
                        className="w-full py-2.5 px-4 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-semibold rounded-lg transition-colors"
                      >
                        Start a Conversation
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </PageWrapper>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] overflow-x-hidden">
      {/* ── Sticky nav ───────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#09090b]/95 backdrop-blur-xl border-b border-[#27272a]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex-shrink-0">
            <LogoMark size="lg" />
          </Link>
          <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
            <a href="#how-it-works" className="px-3.5 py-1.5 text-[13px] text-[#71717a] hover:text-[#fafafa] hover:bg-[#18181b] rounded-lg transition-colors font-medium">How It Works</a>
            <a href="#features" className="px-3.5 py-1.5 text-[13px] text-[#71717a] hover:text-[#fafafa] hover:bg-[#18181b] rounded-lg transition-colors font-medium">Features</a>
            <a href="#roles" className="px-3.5 py-1.5 text-[13px] text-[#71717a] hover:text-[#fafafa] hover:bg-[#18181b] rounded-lg transition-colors font-medium">Use Cases</a>
            <Link to="/survey" className="px-3.5 py-1.5 text-[13px] text-[#71717a] hover:text-[#fafafa] hover:bg-[#18181b] rounded-lg transition-colors font-medium">Survey</Link>
          </nav>
          <Link to="/login" className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-semibold rounded-lg transition-colors shadow-md shadow-[#3b82f6]/20">
            Sign In
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-24 px-4 sm:px-6 lg:px-10 overflow-hidden">
        {/* Ambient glow blobs */}
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#3b82f6]/6 rounded-full blur-[120px]" />
        <div className="pointer-events-none absolute top-20 right-0 w-[350px] h-[350px] bg-[#6366f1]/5 rounded-full blur-[100px]" />
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[1fr_430px] gap-12 lg:gap-20 items-center">
          {/* LEFT */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-7">
              <div className="inline-flex items-center gap-1.5 bg-[#18181b] border border-[#27272a] rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full animate-blink" />
                <span className="text-[11px] text-[#a1a1aa]">All systems operational</span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-[#3b82f6]/10 border border-[#3b82f6]/20 rounded-full px-3 py-1">
                <span className="text-[11px] text-[#60a5fa] font-semibold">Final Year IT Project · 2026</span>
              </div>
            </div>
            <h1 className="text-[40px] sm:text-[52px] lg:text-[60px] font-black text-[#fafafa] leading-[1.05] tracking-tight mb-6">
              IT Support,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3b82f6] to-[#6366f1]">powered by AI.</span>
            </h1>
            <p className="text-[16px] sm:text-[17px] text-[#71717a] leading-[1.75] mb-8 max-w-[480px]">
              Describe your problem in plain English. HiTicket creates, routes, and tracks your IT ticket in seconds — no forms, no hold music.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[14px] font-bold rounded-xl transition-colors shadow-lg shadow-[#3b82f6]/25"
              >
                Get Started Free
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                to="/survey"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-[#27272a] bg-[#18181b] hover:bg-[#1c1c1f] hover:border-[#3f3f46] text-[#a1a1aa] hover:text-[#fafafa] text-[14px] font-medium rounded-xl transition-all"
              >
                <svg className="w-4 h-4 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Take Our Survey
              </Link>
            </div>
            {/* Social proof */}
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {['#3b82f6', '#6366f1', '#22c55e', '#f59e0b'].map((color, i) => (
                  <div key={i} className="w-7 h-7 rounded-full border-2 border-[#09090b] flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ backgroundColor: color }}>
                    {['JD', 'MP', 'AR', 'SK'][i]}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[12.5px] font-semibold text-[#fafafa]">Trusted by 2,400+ users</p>
                <p className="text-[11px] text-[#52525b]">Across campus &amp; IT departments</p>
              </div>
            </div>
          </div>

          {/* RIGHT — live ticket card */}
          <div className="hidden lg:block relative">
            <div className="bg-[#111113] border border-[#27272a] rounded-2xl p-5 shadow-2xl ring-1 ring-[#3b82f6]/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-gradient-to-br from-[#3b82f6] to-[#6366f1] rounded-xl flex items-center justify-center shadow-md">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-[#fafafa]">HiTicket AI</p>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full" />
                      <span className="text-[10px] text-[#22c55e] font-medium">Online & ready</span>
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-['JetBrains_Mono'] text-[#3b82f6] bg-[#3b82f6]/10 border border-[#3b82f6]/20 px-2.5 py-1 rounded-lg">#HT-2048</span>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-start">
                  <div className="bg-[#27272a] rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%]">
                    <p className="text-[12.5px] text-[#fafafa] leading-relaxed">Hi! Describe your IT issue and I'll create a ticket instantly.</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-gradient-to-br from-[#3b82f6] to-[#2563eb] rounded-2xl rounded-tr-sm px-3.5 py-2.5 max-w-[85%] shadow-md shadow-[#3b82f6]/20">
                    <p className="text-[12.5px] text-white leading-relaxed">My laptop won't connect to campus WiFi</p>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-[#27272a] rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[92%] space-y-2">
                    <p className="text-[12.5px] text-[#fafafa]">Ticket <span className="text-[#3b82f6] font-bold">#HT-2048</span> created and assigned</p>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
                      <span className="px-2 py-0.5 rounded-md bg-[#ef4444]/15 border border-[#ef4444]/25 text-[#ef4444] font-semibold">High Priority</span>
                      <span className="px-2 py-0.5 rounded-md bg-[#27272a] border border-[#3f3f46] text-[#a1a1aa]">Network Support</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#27272a] pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#52525b] font-medium">Resolution progress</span>
                  <span className="text-[11px] text-[#f59e0b] font-semibold">In Progress</span>
                </div>
                <div className="h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                  <div className="h-full w-2/3 bg-gradient-to-r from-[#3b82f6] to-[#f59e0b] rounded-full" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#f59e0b]/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-[11px] text-[#52525b]">Assigned to Ravi K. · 3 min ago</span>
                </div>
              </div>
            </div>
            {/* Floating badges */}
            <div className="absolute -top-3 -right-3 flex items-center gap-1.5 bg-[#22c55e] text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg shadow-[#22c55e]/30">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              Ticket created in 8s
            </div>
            <div className="absolute -bottom-5 -left-5 bg-[#18181b] border border-[#27272a] rounded-2xl px-5 py-3.5 shadow-xl">
              <p className="text-[26px] font-black text-[#3b82f6] leading-none mb-1">98%</p>
              <p className="text-[10.5px] text-[#52525b]">User satisfaction</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── KPI ribbon ────────────────────────────────────────────────────── */}
      <section className="border-y border-[#27272a] bg-[#0d0d0f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y divide-[#27272a] lg:divide-y-0">
            {[
              { value: '2,400+', label: 'Tickets Resolved',  sub: 'Since launch',       color: '#3b82f6' },
              { value: '98%',    label: 'User Satisfaction', sub: 'Avg CSAT score',     color: '#22c55e' },
              { value: '< 2h',   label: 'Avg. Resolution',   sub: 'Open to closed',     color: '#f59e0b' },
              { value: '8s',     label: 'Ticket Created In', sub: 'From first message', color: '#8b5cf6' },
            ].map(({ value, label, sub, color }) => (
              <div key={label} className="px-8 py-8">
                <p className="text-[32px] sm:text-[38px] font-black leading-none mb-2" style={{ color }}>{value}</p>
                <p className="text-[13px] font-semibold text-[#fafafa] mb-0.5">{label}</p>
                <p className="text-[11px] text-[#52525b]">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[11px] text-[#3b82f6] font-bold uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-[28px] sm:text-[38px] font-black text-[#fafafa] leading-tight mb-4">
              From issue to resolved<br />in minutes.
            </h2>
            <p className="text-[14px] text-[#52525b] max-w-lg mx-auto leading-relaxed">
              No phone queues, no confusing forms. Describe your problem in plain English and HiTicket handles the rest.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { n: '01', color: '#3b82f6', title: 'Describe your issue', desc: 'Open the AI chatbot and explain your problem just like messaging a colleague.', path: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
              { n: '02', color: '#8b5cf6', title: 'AI categorises & routes', desc: 'HiTicket determines category and priority, then routes to the right IT agent instantly.', path: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2' },
              { n: '03', color: '#f59e0b', title: 'Agent investigates', desc: 'Your IT agent gets instant notification and starts working with full context provided.', path: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z' },
              { n: '04', color: '#22c55e', title: 'Track & get notified', desc: 'Follow real-time status updates and receive a notification the moment your issue is resolved.', path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
            ].map(({ n, color, title, desc, path }) => (
              <div key={n} className="relative bg-[#111113] border border-[#27272a] rounded-2xl p-6 hover:border-[#3f3f46] transition-all group">
                <div className="flex items-start justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
                    <svg className="w-5 h-5" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
                    </svg>
                  </div>
                  <span className="text-[32px] font-black leading-none" style={{ color: `${color}18` }}>{n}</span>
                </div>
                <h3 className="text-[14px] font-bold text-[#fafafa] mb-2">{title}</h3>
                <p className="text-[12.5px] text-[#52525b] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link to="/login" className="inline-flex items-center gap-2 text-[#3b82f6] hover:text-[#60a5fa] text-[13px] font-semibold transition-colors">
              Try it yourself
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 border-t border-[#27272a] bg-[#0d0d0f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <div>
              <p className="text-[11px] text-[#3b82f6] font-bold uppercase tracking-widest mb-3">Features</p>
              <h2 className="text-[28px] sm:text-[38px] font-black text-[#fafafa] leading-tight">
                Everything your<br />IT team needs.
              </h2>
            </div>
            <p className="text-[13px] text-[#52525b] max-w-xs leading-relaxed">Streamline support with intelligent automation, real-time tracking, and role-based access.</p>
          </div>
          {/* Bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Hero feature — spans 2 cols */}
            <div className="lg:col-span-2 bg-[#111113] border border-[#27272a] rounded-2xl p-6 flex flex-col sm:flex-row gap-6 hover:border-[#3f3f46] transition-all group">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center">
                  <svg className="w-7 h-7 text-[#3b82f6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-[18px] font-black text-[#fafafa] mb-2">Instant AI Ticket Creation</h3>
                <p className="text-[13.5px] text-[#71717a] leading-relaxed mb-4">
                  Submit tickets in under 30 seconds via a conversational AI interface. No dropdowns, no categories, no jargon — just describe your problem and HiTicket handles classification automatically.
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20">
                  <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full" />
                  <span className="text-[11.5px] text-[#22c55e] font-semibold">Avg. 8 seconds from open to ticket created</span>
                </div>
              </div>
            </div>
            {/* Feature cards */}
            {[
              { path: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2', color: '#8b5cf6', title: 'AI-Powered Routing',   desc: 'Auto-categorise and assign tickets to the right team based on content and context.' },
              { path: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: '#06b6d4', title: 'Real-Time Dashboard',   desc: 'Track open, in-progress, and resolved tickets live with rich analytics.' },
              { path: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', color: '#f59e0b', title: 'Smart Notifications',   desc: 'Email, push, and in-app alerts on every ticket status change, automatically.' },
              { path: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', color: '#22c55e', title: 'Team Collaboration',   desc: 'Assign, comment, escalate, and resolve tickets together as a unified IT team.' },
              { path: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z', color: '#ec4899', title: 'Analytics & Reports',  desc: 'Resolution metrics, SLA tracking, category breakdowns, and team performance summaries.' },
            ].map((f) => (
              <div key={f.title} className="bg-[#111113] border border-[#27272a] rounded-xl p-5 hover:border-[#3f3f46] hover:bg-[#141417] transition-all">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${f.color}15`, border: `1px solid ${f.color}25` }}>
                  <svg className="w-5 h-5" style={{ color: f.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={f.path} />
                  </svg>
                </div>
                <h3 className="text-[14px] font-bold text-[#fafafa] mb-2">{f.title}</h3>
                <p className="text-[12.5px] text-[#71717a] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who Uses HiTicket ──────────────────────────────────────────────── */}
      <section id="roles" className="py-24 px-4 sm:px-6 lg:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[11px] text-[#a855f7] font-bold uppercase tracking-widest mb-3">Use Cases</p>
            <h2 className="text-[28px] sm:text-[38px] font-black text-[#fafafa] leading-tight mb-4">Built for every role.</h2>
            <p className="text-[14px] text-[#52525b] max-w-md mx-auto">Whether you're raising tickets or resolving them, HiTicket fits your workflow.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              {
                iconPath: 'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z',
                role: 'Students', color: '#3b82f6',
                headline: 'Submit tickets in seconds.',
                points: ['Describe issues in plain English', 'Track status from any device', 'Instant notification on resolution', 'Works on mobile and laptop'],
              },
              {
                iconPath: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
                role: 'IT Staff & Agents', color: '#f59e0b',
                headline: 'Resolve faster, collaborate smarter.',
                points: ['Live dashboard with all open tickets', 'Auto-assigned by category', 'Comment, escalate, and close tickets', 'Full audit trail via activity log'],
              },
              {
                iconPath: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
                role: 'Admins & Managers', color: '#22c55e',
                headline: 'Full visibility and control.',
                points: ['Analytics, resolution rates, reports', 'Role-based access & user management', 'Activity log for compliance audits', 'SLA-aware priority escalation'],
              },
            ].map(({ iconPath, role, color, headline, points }) => (
              <div key={role} className="bg-[#111113] border border-[#27272a] rounded-2xl p-6 hover:border-[#3f3f46] transition-all">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ backgroundColor: `${color}12`, border: `1px solid ${color}22` }}>
                  <svg className="w-6 h-6" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
                  </svg>
                </div>
                <p className="text-[10.5px] font-black uppercase tracking-wider mb-1.5" style={{ color }}>{role}</p>
                <h3 className="text-[15px] font-bold text-[#fafafa] mb-4 leading-tight">{headline}</h3>
                <ul className="space-y-2.5">
                  {points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2.5 text-[12.5px] text-[#71717a]">
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech Stack ─────────────────────────────────────────────────────── */}
      <section className="py-16 border-t border-[#27272a] bg-[#0d0d0f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-8">
            <div className="flex-shrink-0 sm:w-52">
              <p className="text-[10px] text-[#3f3f46] font-bold uppercase tracking-widest mb-2">Built with</p>
              <h3 className="text-[18px] font-black text-[#fafafa] leading-tight">Modern,<br />production-grade<br />tech.</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { name: 'React 19',          color: '#61dafb' },
                { name: 'Vite',              color: '#f59e0b' },
                { name: 'Tailwind CSS v3',   color: '#06b6d4' },
                { name: 'Node.js',           color: '#22c55e' },
                { name: 'Express.js',        color: '#a1a1aa' },
                { name: 'MongoDB Atlas',     color: '#4db33d' },
                { name: 'JWT Auth',          color: '#f97316' },
                { name: '2FA (TOTP + OTP)',  color: '#a855f7' },
                { name: 'REST API',          color: '#3b82f6' },
                { name: 'Role-Based Access', color: '#ec4899' },
                { name: 'Helmet.js',         color: '#ef4444' },
                { name: 'Rate Limiting',     color: '#71717a' },
              ].map(({ name, color }) => (
                <div key={name} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181b] border border-[#27272a] hover:border-[#3f3f46] transition-colors text-[11.5px] font-medium" style={{ color }}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Survey CTA ──────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 items-stretch bg-gradient-to-br from-[#f59e0b]/6 via-[#18181b] to-[#3b82f6]/6 border border-[#27272a] rounded-2xl overflow-hidden">
            <div className="p-8 sm:p-10">
              <div className="w-12 h-12 bg-[#f59e0b]/12 border border-[#f59e0b]/25 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h2 className="text-[24px] sm:text-[30px] font-black text-[#fafafa] mb-3 leading-tight">Help us build better IT support.</h2>
              <p className="text-[13.5px] text-[#71717a] leading-relaxed mb-7">
                Take our anonymous 3-minute survey. Your feedback directly shapes HiTicket's roadmap.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  { text: '10 quick questions', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
                  { text: 'No account required', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                  { text: 'Fully anonymous', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
                ].map(({ text, icon }) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3.5 h-3.5 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                      </svg>
                    </div>
                    <span className="text-[13px] text-[#a1a1aa]">{text}</span>
                  </div>
                ))}
              </div>
              <Link
                to="/survey"
                className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-[#f59e0b] hover:bg-[#d97706] text-[#09090b] text-[14px] font-bold rounded-xl transition-colors shadow-lg shadow-[#f59e0b]/15"
              >
                Take the Survey
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="border-l border-[#27272a] p-8 sm:p-10 bg-[#0d0d0f]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[12.5px] font-bold text-[#fafafa]">Survey Preview</p>
                <span className="text-[10px] text-[#52525b] font-['JetBrains_Mono'] bg-[#27272a] px-2 py-1 rounded">Q1 of 10</span>
              </div>
              <div className="h-1.5 bg-[#27272a] rounded-full mb-6 overflow-hidden">
                <div className="h-full w-[10%] bg-[#f59e0b] rounded-full" />
              </div>
              <p className="text-[14px] font-bold text-[#fafafa] mb-1.5">What best describes your role?</p>
              <p className="text-[11.5px] text-[#52525b] mb-5">Helps us understand who HiTicket serves</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Student', selected: true },
                  { label: 'IT Staff / Agent', selected: false },
                  { label: 'Faculty', selected: false },
                ].map(({ label, selected }) => (
                  <div
                    key={label}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-[12.5px] transition-colors ${selected ? 'border-[#f59e0b]/50 bg-[#f59e0b]/8 text-[#fafafa]' : 'border-[#27272a] text-[#52525b]'}`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 transition-colors ${selected ? 'border-[#f59e0b] bg-[#f59e0b]' : 'border-[#3f3f46]'}`} />
                    {label}
                    {selected && (
                      <svg className="w-3.5 h-3.5 text-[#f59e0b] ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="border-t border-[#27272a] bg-[#0d0d0f] py-24 px-4 sm:px-6 lg:px-10 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#3b82f6]/4 via-transparent to-transparent" />
        <div className="max-w-2xl mx-auto text-center relative">
          <div className="flex justify-center mb-7">
            <LogoMark size="xl" showWordmark={false} />
          </div>
          <h2 className="text-[30px] sm:text-[40px] font-black text-[#fafafa] mb-4 leading-tight">
            Ready to streamline<br />IT support?
          </h2>
          <p className="text-[15px] text-[#52525b] mb-10 leading-relaxed">
            Join 2,400+ users who've switched to faster, smarter IT support.<br className="hidden sm:block" />No configuration required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[15px] font-bold rounded-xl transition-colors shadow-xl shadow-[#3b82f6]/20"
            >
              Get Started Free
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              to="/survey"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-[#27272a] bg-[#18181b] hover:bg-[#1c1c1f] hover:border-[#3f3f46] text-[#a1a1aa] hover:text-[#fafafa] text-[15px] font-medium rounded-xl transition-all"
            >
              <svg className="w-4 h-4 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Take the Survey
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#27272a] py-14 px-4 sm:px-6 lg:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mb-10">
            <div>
              <div className="mb-4">
                <LogoMark size="sm" />
              </div>
              <p className="text-[12.5px] text-[#52525b] leading-relaxed max-w-xs">AI-powered IT helpdesk for modern teams. Built as a final year project with React 19, Node.js, and MongoDB Atlas.</p>
            </div>
            <div>
              <p className="text-[10.5px] font-bold text-[#71717a] uppercase tracking-widest mb-4">Product</p>
              <div className="space-y-2.5">
                <Link to="/login" className="block text-[12.5px] text-[#52525b] hover:text-[#a1a1aa] transition-colors">Sign In / Register</Link>
                <Link to="/survey" className="block text-[12.5px] text-[#52525b] hover:text-[#a1a1aa] transition-colors">Take Our Survey</Link>
                <a href="#features" className="block text-[12.5px] text-[#52525b] hover:text-[#a1a1aa] transition-colors">Features</a>
                <a href="#how-it-works" className="block text-[12.5px] text-[#52525b] hover:text-[#a1a1aa] transition-colors">How It Works</a>
              </div>
            </div>
            <div>
              <p className="text-[10.5px] font-bold text-[#71717a] uppercase tracking-widest mb-4">Info</p>
              <div className="space-y-2.5">
                <a href="#" className="block text-[12.5px] text-[#52525b] hover:text-[#a1a1aa] transition-colors">Privacy Policy</a>
                <a href="#" className="block text-[12.5px] text-[#52525b] hover:text-[#a1a1aa] transition-colors">Terms of Service</a>
                <a href="#" className="block text-[12.5px] text-[#52525b] hover:text-[#a1a1aa] transition-colors">Contact Support</a>
                <a href="#" className="block text-[12.5px] text-[#52525b] hover:text-[#a1a1aa] transition-colors">Report an Issue</a>
              </div>
            </div>
          </div>
          <div className="pt-7 border-t border-[#27272a] flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-[11px] text-[#3f3f46]">© 2026 HiTicket &ndash; Final Year IT Project.</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full" />
              <span className="text-[11px] text-[#3f3f46]">All systems operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
