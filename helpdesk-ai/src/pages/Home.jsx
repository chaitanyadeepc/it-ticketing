import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import Button from '../components/ui/Button';
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
        <div className="w-full px-4 sm:px-6 lg:px-8 py-5">

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

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">

              {/* ── LEFT column (2/3) ── */}
              <div className="md:col-span-1 lg:col-span-2 space-y-5">

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
              <div className="space-y-5">

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
    <PageWrapper>
      {/* Hero */}
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-14 pb-20">
        <div className="text-center max-w-3xl mx-auto">
          {/* Status pill */}
          <div className="inline-flex items-center gap-2 bg-[#18181b] border border-[#27272a] rounded-full px-3 py-1 mb-6 animate-fade-in">
            <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full animate-blink" />
            <span className="text-[12px] font-medium text-[#a1a1aa]">All systems operational</span>
          </div>

          <h1 className="display mb-4 animate-fade-in" style={{ animationDelay: '0.08s' }}>
            The IT Support Platform<br />
            Built for <span className="text-[#3b82f6]">Speed</span>.
          </h1>

          <p className="text-[16px] leading-[1.7] text-[#a1a1aa] max-w-lg mx-auto mb-8 animate-fade-in" style={{ animationDelay: '0.16s' }}>
            Raise, track, and resolve IT tickets through a conversational AI interface.
            No forms. No complexity. Just fast support.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-8 animate-fade-in" style={{ animationDelay: '0.24s' }}>
            <Button variant="primary" size="lg" onClick={() => navigate('/chatbot')} className="w-full sm:w-auto min-w-[180px] flex items-center gap-2 justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Raise a Ticket
            </Button>
            <Button variant="secondary" size="lg" onClick={() => navigate('/my-tickets')} className="w-full sm:w-auto min-w-[180px] flex items-center gap-2 justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10" />
              </svg>
              View Dashboard
            </Button>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-2 animate-fade-in" style={{ animationDelay: '0.32s' }}>
            <div className="flex -space-x-2">
              {avatarColors.map((color, i) => (
                <div key={i} className="w-7 h-7 rounded-full border-2 border-[#09090b] flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: color }}>
                  {avatarInitials[i]}
                </div>
              ))}
            </div>
            <span className="text-[13px] text-[#52525b]">Trusted by 2,400+ users</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="border-y border-[#27272a] py-10 sm:py-16">
          <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-4 sm:gap-8 md:gap-12">
            {[
              { value: '2,400+', label: 'Tickets Resolved', color: '#3b82f6', icon: <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
              { value: '98%',    label: 'User Satisfaction',     color: '#22c55e', icon: <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
              { value: '< 2hrs', label: 'Avg Res. Time',         color: '#f59e0b', icon: <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
            ].map(({ value, label, color, icon }, i) => (
              <div key={i} className={`text-center ${i === 1 ? 'border-x border-[#27272a]' : ''}`}>
                <div className="flex justify-center mb-2 sm:mb-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18`, color }}>{icon}</div>
                </div>
                <div className="font-bold text-[20px] sm:text-[34px] text-[#fafafa] mb-0.5 sm:mb-1" style={{ color }}>{value}</div>
                <div className="text-[10px] sm:text-[13px] text-[#52525b] leading-tight">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="py-20">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-[26px] font-bold text-[#fafafa] mb-2">Everything your IT team needs</h2>
            <p className="text-[14px] text-[#a1a1aa] max-w-md mx-auto">
              Streamline your support workflow with intelligent automation and real-time tracking
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div key={i} className="bg-[#18181b] border border-[#27272a] border-l-[3px] rounded-xl p-5 hover:border-[#3f3f46] hover:bg-[#1c1c1f] transition-all duration-200 group" style={{ borderLeftColor: f.color }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:opacity-90 transition-opacity" style={{ backgroundColor: `${f.color}18` }}>
                  <svg className="w-5 h-5" style={{ color: f.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                  </svg>
                </div>
                <h3 className="text-[14px] font-semibold text-[#fafafa] mb-1.5">{f.title}</h3>
                <p className="text-[13px] text-[#a1a1aa] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Banner */}
      <div className="py-16 border-t border-[#27272a]">
        <div className="w-full px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-r from-[#3b82f6]/10 to-[#6366f1]/10 border border-[#3b82f6]/20 rounded-2xl p-5 sm:p-10">
            <div className="w-12 h-12 bg-[#3b82f6] rounded-xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#3b82f6]/20">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2m-4 9.5a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1m8 0a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1M3 15h18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1Z" />
              </svg>
            </div>
            <h2 className="text-[22px] font-bold text-[#fafafa] mb-3">Ready to streamline IT support?</h2>
            <p className="text-[14px] text-[#a1a1aa] mb-6">Get started in seconds. No configuration required.</p>
            <Button variant="primary" size="lg" onClick={() => navigate('/chatbot')}>
              Get Started Free
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#27272a] py-8">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[13px] text-[#52525b]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#3b82f6] rounded-md flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2m-4 9.5a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1m8 0a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1M3 15h18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1Z" />
              </svg>
            </div>
            <span>HiTicket &copy; 2026</span>
          </div>
          <div className="flex gap-5">
            <a href="#" className="hover:text-[#a1a1aa] transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-[#a1a1aa] transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-[#a1a1aa] transition-colors">Contact Support</a>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default Home;
