import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import Button from '../components/ui/Button';
import LogoMark from '../components/ui/LogoMark';
import api from '../api/api';

const avatarColors = ['#3b82f6', '#6366f1', '#22c55e', '#f59e0b'];
const avatarInitials = ['JD', 'MP', 'AR', 'SK'];

const features = [
  { icon: 'M13 10V3L4 14h7v7l9-11h-7z', color: '#3b82f6', title: 'Instant Ticket Creation', desc: 'Submit tickets in under 30 seconds via a guided AI chat.' },
  { icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2', color: '#6366f1', title: 'AI-Powered Routing', desc: 'Auto-categorise and assign tickets to the right team instantly.' },
  { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: '#06b6d4', title: 'Real-Time Dashboard', desc: 'Track all open tickets and agent activity in a live dashboard.' },
  { icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', color: '#f59e0b', title: 'Smart Notifications', desc: 'Get notified on every status change — email, push, or in-app.' },
  { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', color: '#22c55e', title: 'Team Collaboration', desc: 'Assign, comment, and resolve tickets together as a team.' },
  { icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z', color: '#ec4899', title: 'Analytics & Reports', desc: 'Weekly summaries and resolution metrics for your IT team.' },
];

// Tiny progress bar component
const Bar = ({ value, max, color }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-[#27272a] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[11px] font-['JetBrains_Mono'] text-[#52525b] w-8 text-right">{pct}%</span>
    </div>
  );
};

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

  // ── Greeting time ──────────────────────────────────────────────────────────
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (isAuthenticated) {
    return (
      <PageWrapper>
        <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-5 overflow-x-hidden">

          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4 mb-5 p-5 rounded-2xl bg-gradient-to-r from-[#3b82f6]/8 via-[#6366f1]/4 to-transparent border border-[#3b82f6]/15 animate-fade-in">
            <div>
              <p className="text-[13px] text-[#a1a1aa] mb-0.5">{greeting},</p>
              <h1 className="text-[28px] font-bold text-[#fafafa]">{firstName}</h1>
              {isAdmin && (
                <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#f59e0b] text-[11px] font-medium">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  Admin
                </span>
              )}
            </div>
            {statsLoading && (
              <div className="flex gap-2 mt-1">
                {[64, 48, 56, 40].map((w, i) => (
                  <div key={i} className="skeleton rounded-full" style={{ width: w, height: 20 }} />
                ))}
              </div>
            )}
          </div>

          {statsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-[#27272a] bg-[#18181b] p-4 space-y-2">
                  <div className="skeleton h-8 w-12 rounded" />
                  <div className="skeleton h-4 w-20 rounded" />
                  <div className="skeleton h-3 w-24 rounded" />
                </div>
              ))}
            </div>
          ) : total === 0 ? (
            /* ── Empty state ── */
            <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-12 text-center max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3b82f6]/20 to-[#6366f1]/20 border border-[#3b82f6]/20 flex items-center justify-center mx-auto mb-5">
                <svg className="w-7 h-7 text-[#3b82f6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
              </div>
              <h2 className="text-[17px] font-semibold text-[#fafafa] mb-2">No tickets yet</h2>
              <p className="text-[13px] text-[#52525b] mb-6 leading-relaxed">Use the AI chatbot to raise your first support request. It'll guide you through the whole process.</p>
              <Button variant="primary" onClick={() => navigate('/chatbot')}>
                <svg className="w-4 h-4 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                Raise a Ticket
              </Button>
            </div>
          ) : (
            <>
              {/* Stat chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-5">
                {[
                  { label: 'Open', value: open, color: '#22c55e', sub: 'Active' },
                  { label: 'In Progress', value: inProgress, color: '#f59e0b', sub: 'Handling' },
                  { label: 'Resolved', value: resolved + closed, color: '#06b6d4', sub: 'Completed' },
                  { label: 'Critical', value: critical, color: '#ef4444', sub: 'Urgent' },
                ].map(({ label, value, color, sub }) => (
                  <div key={label} className="rounded-xl border p-3 sm:p-4 relative overflow-hidden" style={{ borderColor: `${color}30`, background: `linear-gradient(135deg, ${color}0d 0%, transparent 70%)` }}>
                    <div className="text-[24px] sm:text-[32px] font-bold leading-none mb-1" style={{ color }}>{value}</div>
                    <div className="text-[12px] sm:text-[13px] font-medium text-[#fafafa] leading-tight">{label}</div>
                    <div className="text-[10px] sm:text-[11px] text-[#52525b] mt-0.5">{sub}</div>
                    <div className="absolute -right-4 -bottom-4 w-14 h-14 rounded-full blur-2xl opacity-25" style={{ backgroundColor: color }} />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

              {/* ── LEFT column (2/3) ── */}
              <div className="min-w-0 md:col-span-1 lg:col-span-2 space-y-5">

                {/* Status overview card */}
                <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-[14px] font-semibold text-[#fafafa]">Ticket Overview</h2>
                    <span className="text-[12px] text-[#52525b] font-['JetBrains_Mono']">{total} total</span>
                  </div>

                  {/* Resolution rate ring */}
                  <div className="flex items-center gap-4 sm:gap-6 mb-5">
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0">
                      <svg className="w-16 h-16 sm:w-20 sm:h-20 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#27272a" strokeWidth="3"/>
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#3b82f6" strokeWidth="3"
                          strokeDasharray={`${resolutionRate * 0.879} ${100 - resolutionRate * 0.879}`}
                          strokeLinecap="round"/>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[14px] sm:text-[16px] font-bold text-[#fafafa]">{resolutionRate}%</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] text-[#a1a1aa] mb-1">Resolution rate</p>
                      <p className="text-[12px] text-[#52525b]">{resolved + closed} resolved · {unresolved} still open</p>
                      {critical > 0 && (
                        <p className="mt-2 text-[12px] text-[#ef4444] font-medium flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                          {critical} critical {critical === 1 ? 'ticket' : 'tickets'} need attention
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status bars */}
                  <div className="space-y-3">
                    {[
                      { label: 'Open', value: open, color: '#22c55e' },
                      { label: 'In Progress', value: inProgress, color: '#f59e0b' },
                      { label: 'Resolved', value: resolved, color: '#3b82f6' },
                      { label: 'Closed', value: closed, color: '#52525b' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex items-center gap-3">
                        <span className="text-[12px] text-[#a1a1aa] w-20 flex-shrink-0">{label}</span>
                        <div className="flex-1 h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: total > 0 ? `${(value / total) * 100}%` : '0%', backgroundColor: color }} />
                        </div>
                        <span className="text-[12px] font-['JetBrains_Mono'] text-[#52525b] w-5 text-right">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent activity */}
                <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[14px] font-semibold text-[#fafafa]">Recent Activity</h2>
                    <button onClick={() => navigate(isAdmin ? '/admin' : '/my-tickets')} className="text-[12px] text-[#3b82f6] hover:underline">
                      View all →
                    </button>
                  </div>
                  <div className="space-y-1">
                    {recent.map((t) => (
                      <button
                        key={t._id}
                        onClick={() => navigate(`/tickets/${t._id}`)}
                        className="w-full flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2.5 rounded-lg hover:bg-[#27272a] transition-colors text-left group"
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLOR[t.status] || '#52525b' }} />
                        <span className="flex-1 text-[12px] sm:text-[13px] text-[#fafafa] truncate min-w-0">{t.title}</span>
                        <span className={`text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-medium flex-shrink-0 whitespace-nowrap ${STATUS_BG[t.status] || 'bg-[#27272a] text-[#a1a1aa]'}`}>{t.status}</span>
                        <span className="hidden sm:block text-[10px] font-['JetBrains_Mono'] text-[#3f3f46] group-hover:text-[#52525b] ml-1 flex-shrink-0">{t.ticketId || ''}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── RIGHT column (1/3) ── */}
              <div className="min-w-0 space-y-5">

                {/* Priority breakdown */}
                <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
                  <h2 className="text-[14px] font-semibold text-[#fafafa] mb-4">By Priority</h2>
                  <div className="space-y-3">
                    {['Critical', 'High', 'Medium', 'Low'].map((p) => {
                      const count = tickets.filter((t) => t.priority === p).length;
                      return (
                        <div key={p} className="flex items-center gap-3">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PRIORITY_COLOR[p] }} />
                          <span className="text-[12px] text-[#a1a1aa] flex-1">{p}</span>
                          <Bar value={count} max={total} color={PRIORITY_COLOR[p]} />
                          <span className="text-[12px] font-['JetBrains_Mono'] text-[#52525b] w-4 text-right">{count}</span>
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
                      {topCategories.map(([cat, count]) => (
                        <div key={cat} className="flex items-center gap-3">
                          <span className="text-[12px] text-[#a1a1aa] flex-1 truncate">{cat}</span>
                          <Bar value={count} max={total} color="#3b82f6" />
                          <span className="text-[12px] font-['JetBrains_Mono'] text-[#52525b] w-4 text-right">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin-only: quick links to manage */}
                {isAdmin && (
                  <div className="bg-gradient-to-br from-[#3b82f6]/10 to-[#6366f1]/10 border border-[#3b82f6]/20 rounded-xl p-5">
                    <h2 className="text-[14px] font-semibold text-[#fafafa] mb-3">Admin Tools</h2>
                    <div className="space-y-2">
                      {[
                        { label: 'Open Admin Dashboard', sub: 'Charts, exports & full ticket table', path: '/admin', color: '#3b82f6' },
                        { label: 'Manage Users', sub: 'Roles, activation & permissions', path: '/admin/users', color: '#a855f7' },
                      ].map(({ label, sub, path, color }) => (
                        <button
                          key={path}
                          onClick={() => navigate(path)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg bg-[#18181b]/60 hover:bg-[#18181b] border border-transparent hover:border-[#27272a] transition-all text-left group"
                        >
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12.5px] font-medium text-[#fafafa]">{label}</p>
                            <p className="text-[11px] text-[#52525b] truncate">{sub}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* User-only: raise new ticket CTA */}
                {!isAdmin && (
                  <div className="bg-gradient-to-br from-[#3b82f6]/10 to-[#6366f1]/10 border border-[#3b82f6]/20 rounded-xl p-5 text-center">
                    <div className="w-10 h-10 bg-[#3b82f6]/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <svg className="w-5 h-5 text-[#3b82f6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                      </svg>
                    </div>
                    <p className="text-[13px] font-medium text-[#fafafa] mb-1">Need more help?</p>
                    <p className="text-[12px] text-[#52525b] mb-4">Our AI chatbot will guide you through raising a new ticket in seconds.</p>
                    <button
                      onClick={() => navigate('/chatbot')}
                      className="w-full py-2 px-4 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-medium rounded-lg transition-colors"
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
      {/* ── Custom sticky header ─────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#09090b]/90 backdrop-blur-md border-b border-[#27272a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between">
          <Link to="/">
            <LogoMark size="sm" />
          </Link>
          <div className="hidden sm:flex items-center gap-1">
            <a href="#how-it-works" className="px-3 py-1.5 text-[13px] text-[#71717a] hover:text-[#fafafa] hover:bg-[#18181b] rounded-lg transition-colors">How It Works</a>
            <a href="#features" className="px-3 py-1.5 text-[13px] text-[#71717a] hover:text-[#fafafa] hover:bg-[#18181b] rounded-lg transition-colors">Features</a>
            <Link to="/survey" className="px-3 py-1.5 text-[13px] text-[#71717a] hover:text-[#fafafa] hover:bg-[#18181b] rounded-lg transition-colors">Survey</Link>
          </div>
          <Link to="/login" className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-semibold rounded-lg transition-colors">
            Sign In
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-[55%_45%] gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <div className="inline-flex items-center gap-1.5 bg-[#18181b] border border-[#27272a] rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full animate-blink" />
                <span className="text-[11px] text-[#a1a1aa]">All systems operational</span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-[#3b82f6]/10 border border-[#3b82f6]/20 rounded-full px-3 py-1">
                <span className="text-[11px] text-[#3b82f6] font-medium">Final Year IT Project · 2026</span>
              </div>
            </div>
            <h1 className="text-[38px] sm:text-[48px] lg:text-[56px] font-black text-[#fafafa] leading-[1.07] mb-5">
              IT Support<br />
              <span className="text-[#3b82f6]">reimagined</span><br />
              with AI.
            </h1>
            <p className="text-[16px] text-[#71717a] leading-[1.7] mb-8 max-w-lg">
              Raise, track, and resolve IT tickets through a conversational AI interface. No forms, no phone queues — just describe your problem and HiTicket handles the rest.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Link to="/login" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[14px] font-semibold rounded-xl transition-colors shadow-lg shadow-[#3b82f6]/20">
                Get Started Free
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link to="/survey" className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-[#27272a] bg-[#18181b] hover:bg-[#1c1c1f] hover:border-[#3f3f46] text-[#fafafa] text-[14px] font-medium rounded-xl transition-colors">
                <svg className="w-4 h-4 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Take Our Survey
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {avatarColors.map((color, i) => (
                  <div key={i} className="w-7 h-7 rounded-full border-2 border-[#09090b] flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ backgroundColor: color }}>
                    {avatarInitials[i]}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[12px] font-medium text-[#fafafa]">Trusted by 2,400+ users</p>
                <p className="text-[11px] text-[#52525b]">Across campus &amp; IT departments</p>
              </div>
            </div>
          </div>

          {/* Right: Ticket mockup */}
          <div className="hidden lg:block">
            <div className="relative">
              <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#3b82f6] rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-[#fafafa]">HiTicket AI</p>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full" />
                        <span className="text-[10px] text-[#22c55e]">Online</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-[#3b82f6] bg-[#3b82f6]/10 px-2 py-0.5 rounded">#HT-2048</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-start">
                    <div className="bg-[#27272a] rounded-2xl rounded-tl-sm px-3 py-2 max-w-[80%]">
                      <p className="text-[12px] text-[#fafafa]">Hi! Describe your IT issue and I'll create a ticket instantly.</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-[#3b82f6] rounded-2xl rounded-tr-sm px-3 py-2 max-w-[80%]">
                      <p className="text-[12px] text-white">My laptop won't connect to campus WiFi</p>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-[#27272a] rounded-2xl rounded-tl-sm px-3 py-2 max-w-[90%] space-y-1">
                      <p className="text-[12px] text-[#fafafa]">Ticket <span className="text-[#3b82f6] font-bold">#HT-2048</span> created</p>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-[#ef4444]/15 text-[#ef4444]">High</span>
                        <span className="text-[#52525b]">Network Support · Assigned</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-[#27272a]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-[#52525b]">Resolution progress</span>
                    <span className="text-[11px] text-[#f59e0b] font-medium">In Progress</span>
                  </div>
                  <div className="h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                    <div className="h-full w-2/3 bg-gradient-to-r from-[#3b82f6] to-[#f59e0b] rounded-full" />
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <svg className="w-3.5 h-3.5 text-[#52525b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-[11px] text-[#52525b]">Assigned to Ravi K. · 3 min ago</span>
                  </div>
                </div>
              </div>
              <div className="absolute -top-3 -right-3 bg-[#22c55e] text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg shadow-[#22c55e]/30">
                Ticket created in 8s
              </div>
              <div className="absolute -bottom-4 -left-4 bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-3 shadow-xl">
                <p className="text-[22px] font-black text-[#3b82f6]">98%</p>
                <p className="text-[10px] text-[#52525b]">Satisfaction rate</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section className="border-y border-[#27272a] py-12 bg-[#0d0d0f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { value: '2,400+', label: 'Tickets Resolved',  sub: 'Since launch',       color: '#3b82f6', path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
              { value: '98%',    label: 'User Satisfaction', sub: 'Avg CSAT score',     color: '#22c55e', path: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
              { value: '< 2h',   label: 'Avg. Resolution',   sub: 'Open to closed',     color: '#f59e0b', path: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
              { value: '4 steps',label: 'To Resolve',        sub: 'No forms, no calls', color: '#a855f7', path: 'M13 10V3L4 14h7v7l9-11h-7z' },
            ].map(({ value, label, sub, color, path }) => (
              <div key={label} className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${color}18` }}>
                  <svg className="w-5 h-5" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
                  </svg>
                </div>
                <p className="text-[30px] font-black leading-none mb-1" style={{ color }}>{value}</p>
                <p className="text-[13px] font-medium text-[#fafafa] mb-0.5">{label}</p>
                <p className="text-[11px] text-[#52525b]">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid lg:grid-cols-[300px_1fr] gap-12 items-start">
          <div>
            <p className="text-[11px] text-[#3b82f6] font-semibold uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-[28px] sm:text-[34px] font-black text-[#fafafa] leading-tight mb-4">
              From issue<br />to resolved<br />in minutes.
            </h2>
            <p className="text-[13px] text-[#52525b] leading-relaxed mb-6">
              No phone queues, no confusing forms. Describe your problem in plain English and HiTicket handles the rest.
            </p>
            <Link to="/login" className="inline-flex items-center gap-2 text-[#3b82f6] text-[13px] font-semibold hover:gap-3 transition-all">
              Try it now
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <div className="space-y-4">
            {[
              {
                n: '01', color: '#3b82f6',
                title: 'Describe your issue',
                desc: 'Open the AI chatbot and explain your problem in plain English — just like messaging a colleague.',
                path: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
              },
              {
                n: '02', color: '#8b5cf6',
                title: 'AI categorises & routes',
                desc: 'HiTicket instantly determines category, priority level, and routes the ticket to the right IT agent.',
                path: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2',
              },
              {
                n: '03', color: '#f59e0b',
                title: 'Agent investigates',
                desc: 'Your IT agent gets an instant notification and begins working on your issue with full context.',
                path: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
              },
              {
                n: '04', color: '#22c55e',
                title: 'Track & get notified',
                desc: 'Follow real-time status updates and receive a notification the moment your issue is resolved.',
                path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
              },
            ].map(({ n, color, title, desc, path }) => (
              <div key={n} className="flex gap-5 p-5 bg-[#18181b] border border-[#27272a] rounded-xl hover:border-[#3f3f46] transition-colors">
                <div className="flex-shrink-0 flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18`, border: `1px solid ${color}30` }}>
                    <svg className="w-5 h-5" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
                    </svg>
                  </div>
                  <span className="text-[11px] font-black" style={{ color: `${color}80` }}>{n}</span>
                </div>
                <div className="pt-1">
                  <h3 className="text-[14px] font-semibold text-[#fafafa] mb-1">{title}</h3>
                  <p className="text-[12.5px] text-[#52525b] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section id="features" className="py-16 border-t border-[#27272a] bg-[#0d0d0f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="mb-10">
            <p className="text-[11px] text-[#3b82f6] font-semibold uppercase tracking-widest mb-2">Features</p>
            <h2 className="text-[28px] sm:text-[32px] font-black text-[#fafafa] mb-2">Everything your IT team needs.</h2>
            <p className="text-[13px] text-[#52525b] max-w-md">Streamline support with intelligent automation, real-time tracking, and role-based access.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-[#18181b] border border-[#27272a] rounded-2xl p-6 flex flex-col sm:flex-row gap-6 hover:border-[#3f3f46] transition-colors">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center">
                  <svg className="w-7 h-7 text-[#3b82f6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-[#fafafa] mb-2">Instant AI Ticket Creation</h3>
                <p className="text-[13px] text-[#a1a1aa] leading-relaxed mb-4">
                  Submit tickets in under 30 seconds via a conversational AI interface. No dropdowns, no categories, no jargon — just describe your problem and HiTicket handles the classification automatically.
                </p>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full" />
                  <span className="text-[12px] text-[#22c55e] font-medium">Avg. 8 seconds from open to ticket created</span>
                </div>
              </div>
            </div>
            {[
              { path: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2', color: '#8b5cf6', title: 'AI-Powered Routing',   desc: 'Auto-categorise and assign tickets to the right team based on content.' },
              { path: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: '#06b6d4', title: 'Real-Time Dashboard', desc: 'Track open, in-progress, and resolved tickets live with analytics.' },
              { path: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', color: '#f59e0b', title: 'Smart Notifications',  desc: 'Email, push, and in-app alerts on every ticket status change.' },
              { path: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', color: '#22c55e', title: 'Team Collaboration',  desc: 'Assign, comment, escalate, and resolve as a coordinated team.' },
              { path: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z', color: '#ec4899', title: 'Analytics & Reports',  desc: 'Resolution metrics, category breakdown, and periodic summaries.' },
            ].map((f) => (
              <div key={f.title} className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 hover:border-[#3f3f46] hover:bg-[#1c1c1f] transition-all">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${f.color}18` }}>
                  <svg className="w-5 h-5" style={{ color: f.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={f.path} />
                  </svg>
                </div>
                <h3 className="text-[13.5px] font-semibold text-[#fafafa] mb-1.5">{f.title}</h3>
                <p className="text-[12px] text-[#71717a] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who Uses HiTicket ──────────────────────────────────────────────── */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="mb-10">
          <p className="text-[11px] text-[#a855f7] font-semibold uppercase tracking-widest mb-2">Use Cases</p>
          <h2 className="text-[28px] sm:text-[32px] font-black text-[#fafafa] mb-2">Built for every role.</h2>
          <p className="text-[13px] text-[#52525b]">Whether you're raising tickets or resolving them, HiTicket fits your workflow.</p>
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
            <div key={role} className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 hover:border-[#3f3f46] transition-colors">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${color}14`, border: `1px solid ${color}25` }}>
                <svg className="w-6 h-6" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
                </svg>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color }}>{role}</p>
              <h3 className="text-[15px] font-bold text-[#fafafa] mb-3">{headline}</h3>
              <ul className="space-y-2">
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
      </section>

      {/* ── Tech Stack ─────────────────────────────────────────────────────── */}
      <section className="py-12 border-t border-[#27272a] bg-[#0d0d0f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid lg:grid-cols-[200px_1fr] gap-8 items-center">
            <div>
              <p className="text-[11px] text-[#52525b] font-semibold uppercase tracking-widest mb-2">Stack</p>
              <h2 className="text-[20px] font-black text-[#fafafa]">Modern.<br />Production-grade.</h2>
            </div>
            <div className="flex flex-wrap gap-2.5">
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
                { name: 'Rate Limiting',     color: '#52525b' },
              ].map(({ name, color }) => (
                <div key={name} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#18181b] border border-[#27272a] text-[12px]" style={{ color }}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Survey CTA ──────────────────────────────────────────────────────── */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid lg:grid-cols-2 gap-10 items-center bg-gradient-to-br from-[#f59e0b]/6 to-[#3b82f6]/6 border border-[#27272a] rounded-2xl p-8 sm:p-10">
          <div>
            <div className="w-11 h-11 bg-[#f59e0b]/15 border border-[#f59e0b]/25 rounded-xl flex items-center justify-center mb-5">
              <svg className="w-5 h-5 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h2 className="text-[24px] sm:text-[28px] font-black text-[#fafafa] mb-3">Help us build better IT support.</h2>
            <p className="text-[13px] text-[#71717a] leading-relaxed mb-6">
              Take our anonymous 3-minute survey. Your feedback directly shapes HiTicket's roadmap — and we'll show aggregated results so you can see what others think too.
            </p>
            <div className="space-y-3 mb-6">
              {[
                { text: '10 quick questions',          path: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
                { text: 'No account or login required', path: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                { text: 'Fully anonymous responses',    path: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
              ].map(({ text, path }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-md bg-[#22c55e]/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
                    </svg>
                  </div>
                  <span className="text-[13px] text-[#a1a1aa]">{text}</span>
                </div>
              ))}
            </div>
            <Link to="/survey" className="inline-flex items-center gap-2 px-6 py-3 bg-[#f59e0b] hover:bg-[#d97706] text-[#09090b] text-[14px] font-bold rounded-xl transition-colors shadow-lg shadow-[#f59e0b]/15">
              Take the Survey
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[12px] font-semibold text-[#fafafa]">Survey Preview</p>
              <span className="text-[10px] text-[#52525b] font-mono">Q1 of 10</span>
            </div>
            <div className="h-1.5 bg-[#27272a] rounded-full mb-4 overflow-hidden">
              <div className="h-full w-[10%] bg-[#f59e0b] rounded-full" />
            </div>
            <p className="text-[13px] font-semibold text-[#fafafa] mb-1">What best describes your role?</p>
            <p className="text-[11px] text-[#52525b] mb-4">Helps us understand who HiTicket serves</p>
            <div className="space-y-2">
              {[
                { label: 'Student',          selected: true  },
                { label: 'IT Staff / Agent', selected: false },
                { label: 'Faculty',          selected: false },
              ].map(({ label, selected }) => (
                <div key={label} className={`flex items-center gap-3 p-2.5 rounded-lg border text-[12px] ${selected ? 'border-[#f59e0b]/60 bg-[#f59e0b]/8 text-[#fafafa]' : 'border-[#27272a] text-[#52525b]'}`}>
                  <div className={`w-3 h-3 rounded-full border flex-shrink-0 ${selected ? 'border-[#f59e0b] bg-[#f59e0b]' : 'border-[#3f3f46]'}`} />
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
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="border-t border-[#27272a] bg-[#0d0d0f] py-20 px-4 sm:px-6 lg:px-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="shadow-2xl shadow-[#FF634A]/30 rounded-xl">
              <LogoMark size="xl" showWordmark={false} />
            </div>
          </div>
          <h2 className="text-[30px] sm:text-[36px] font-black text-[#fafafa] mb-4">Ready to streamline IT support?</h2>
          <p className="text-[15px] text-[#52525b] mb-8">Join 2,400+ users who've switched to faster, smarter IT support. No configuration required.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/login" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[14px] font-bold rounded-xl transition-colors shadow-lg shadow-[#3b82f6]/20">
              Get Started Free
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link to="/survey" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border border-[#27272a] bg-[#18181b] hover:bg-[#1c1c1f] text-[#fafafa] text-[14px] font-medium rounded-xl transition-colors">
              <svg className="w-4 h-4 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Take the Survey
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#27272a] py-12 px-4 sm:px-6 lg:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="mb-3">
                <LogoMark size="sm" />
              </div>
              <p className="text-[12px] text-[#52525b] leading-relaxed">AI-powered IT helpdesk for modern teams. Built as a final year project with React 19, Node.js, and MongoDB.</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider mb-3">Product</p>
              <div className="space-y-2">
                <Link to="/login"  className="block text-[12px] text-[#52525b] hover:text-[#a1a1aa] transition-colors">Sign In / Register</Link>
                <Link to="/survey" className="block text-[12px] text-[#52525b] hover:text-[#a1a1aa] transition-colors">Take Our Survey</Link>
                <a href="#features"     className="block text-[12px] text-[#52525b] hover:text-[#a1a1aa] transition-colors">Features</a>
                <a href="#how-it-works" className="block text-[12px] text-[#52525b] hover:text-[#a1a1aa] transition-colors">How It Works</a>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider mb-3">Info</p>
              <div className="space-y-2">
                <a href="#" className="block text-[12px] text-[#52525b] hover:text-[#a1a1aa] transition-colors">Privacy Policy</a>
                <a href="#" className="block text-[12px] text-[#52525b] hover:text-[#a1a1aa] transition-colors">Terms of Service</a>
                <a href="#" className="block text-[12px] text-[#52525b] hover:text-[#a1a1aa] transition-colors">Contact Support</a>
                <a href="#" className="block text-[12px] text-[#52525b] hover:text-[#a1a1aa] transition-colors">Report an Issue</a>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-[#27272a] flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-[11px] text-[#3f3f46]">© 2026 HiTicket. Final Year IT Project.</p>
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
