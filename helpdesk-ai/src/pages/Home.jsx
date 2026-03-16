import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
    <PageWrapper>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-14 pb-20">
        <div className="text-center max-w-3xl mx-auto">
          {/* Status pill */}
          <div className="inline-flex items-center gap-2 bg-[#18181b] border border-[#27272a] rounded-full px-3 py-1 mb-3 animate-fade-in">
            <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full animate-blink" />
            <span className="text-[12px] font-medium text-[#a1a1aa]">All systems operational</span>
          </div>

          {/* Project context badge */}
          <div className="flex justify-center mb-5 animate-fade-in">
            <div className="inline-flex items-center gap-1.5 bg-[#3b82f6]/10 border border-[#3b82f6]/20 rounded-full px-3 py-1">
              <span className="text-[11px] text-[#3b82f6] font-medium">Final Year IT Project · React + Node.js + MongoDB + AI</span>
            </div>
          </div>

          <h1 className="display mb-4 animate-fade-in" style={{ animationDelay: '0.08s' }}>
            The AI-Powered Helpdesk<br />
            Built for <span className="text-[#3b82f6]">Speed</span> &amp; <span className="text-[#22c55e]">Teams</span>.
          </h1>

          <p className="text-[16px] leading-[1.7] text-[#a1a1aa] max-w-xl mx-auto mb-8 animate-fade-in" style={{ animationDelay: '0.16s' }}>
            Raise, track, and resolve IT tickets through a conversational AI interface.
            No forms. No queues. Pure speed — from campus lab to enterprise team.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-8 animate-fade-in" style={{ animationDelay: '0.24s' }}>
            <Button variant="primary" size="lg" onClick={() => navigate('/login')} className="w-full sm:w-auto min-w-[180px] flex items-center gap-2 justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Get Started Free
            </Button>
            <Link
              to="/survey"
              className="w-full sm:w-auto min-w-[180px] flex items-center gap-2 justify-center px-5 py-3 rounded-xl border border-[#27272a] bg-[#18181b] hover:bg-[#1c1c1f] hover:border-[#3f3f46] text-[#fafafa] text-[15px] font-medium transition-all"
            >
              <svg className="w-4 h-4 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              Take Our Survey
            </Link>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-2 animate-fade-in" style={{ animationDelay: '0.32s' }}>
            <div className="flex -space-x-2">
              {avatarColors.map((color, i) => (
                <div key={i} className="w-7 h-7 rounded-full border-2 border-[#09090b] flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ backgroundColor: color }}>
                  {avatarInitials[i]}
                </div>
              ))}
            </div>
            <span className="text-[13px] text-[#52525b]">Trusted by 2,400+ users across campus &amp; teams</span>
          </div>
        </div>
      </div>

      {/* ── How It Works ───────────────────────────────────────────────────── */}
      <div className="py-16 border-y border-[#27272a] bg-[#0d0d0f]">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-[11px] text-[#3b82f6] font-semibold uppercase tracking-widest mb-2">How It Works</p>
            <h2 className="text-[22px] sm:text-[26px] font-bold text-[#fafafa] mb-2">From issue to resolution in minutes</h2>
            <p className="text-[13px] text-[#52525b] max-w-md mx-auto">No phone queues, no confusing forms — just describe your problem and HiTicket handles the rest</p>
          </div>

          {/* Steps */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {[
              { n: '01', icon: '💬', color: '#3b82f6', title: 'Describe your issue', desc: 'Open the AI chatbot and explain your problem in plain English — just like texting a colleague.' },
              { n: '02', icon: '🤖', color: '#8b5cf6', title: 'AI categorises & routes', desc: 'HiTicket automatically determines the category, priority, and assigns it to the right team.' },
              { n: '03', icon: '🛠️', color: '#f59e0b', title: 'Agent investigates', desc: 'Your IT agent gets an instant notification and starts working on your issue right away.' },
              { n: '04', icon: '✅', color: '#22c55e', title: 'Track & get notified', desc: 'Follow real-time status updates and receive a notification the moment your issue is resolved.' },
            ].map(({ n, icon, color, title, desc }) => (
              <div key={n} className="relative bg-[#18181b] border border-[#27272a] rounded-2xl p-5 group hover:border-[#3f3f46] transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: `${color}18`, border: `1px solid ${color}30` }}>
                    {icon}
                  </div>
                  <span className="text-[28px] font-black leading-none" style={{ color: `${color}20` }}>{n}</span>
                </div>
                <h3 className="text-[13.5px] font-semibold text-[#fafafa] mb-2">{title}</h3>
                <p className="text-[12px] text-[#52525b] leading-relaxed">{desc}</p>
                <div className="mt-3 h-0.5 rounded-full w-8" style={{ backgroundColor: color }} />
              </div>
            ))}
          </div>

          {/* Mini ticket preview */}
          <div className="mt-12 max-w-sm mx-auto">
            <p className="text-center text-[11px] text-[#52525b] mb-3 uppercase tracking-widest">Live ticket example</p>
            <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[#3b82f6] bg-[#3b82f6]/10 px-2 py-0.5 rounded">#HT-2048</span>
                  <span className="text-[11px] font-medium text-[#fafafa]">WiFi connection issue</span>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20">High</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#52525b]">
                <span>Network Support</span>
                <span>·</span>
                <span>Assigned to Ravi K.</span>
                <span>·</span>
                <span>2 min ago</span>
              </div>
              <div className="h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                <div className="h-full w-3/4 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] rounded-full" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-[#f59e0b] rounded-full" />
                <span className="text-[11px] text-[#f59e0b] font-medium">In Progress — investigating network adapter settings</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-[#27272a] py-10 sm:py-16">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-4 sm:gap-8 md:gap-12">
            {[
              { value: '2,400+', label: 'Tickets Resolved',   color: '#3b82f6', icon: <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
              { value: '98%',    label: 'User Satisfaction',  color: '#22c55e', icon: <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
              { value: '< 2hrs', label: 'Avg Resolution',     color: '#f59e0b', icon: <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
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

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <div className="py-20">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-[11px] text-[#3b82f6] font-semibold uppercase tracking-widest mb-2">Features</p>
            <h2 className="text-[22px] sm:text-[26px] font-bold text-[#fafafa] mb-2">Everything your IT team needs</h2>
            <p className="text-[13px] text-[#52525b] max-w-md mx-auto">Streamline your support workflow with intelligent automation and real-time tracking</p>
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
                <p className="text-[12.5px] text-[#a1a1aa] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Who uses HiTicket ──────────────────────────────────────────────── */}
      <div className="py-16 border-t border-[#27272a] bg-[#0d0d0f]">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-[11px] text-[#a855f7] font-semibold uppercase tracking-widest mb-2">Use Cases</p>
            <h2 className="text-[22px] sm:text-[26px] font-bold text-[#fafafa] mb-2">Built for every role</h2>
            <p className="text-[13px] text-[#52525b]">Whether you're raising tickets or resolving them, HiTicket fits your workflow</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {[
              {
                icon: '🎓', role: 'Students', color: '#3b82f6',
                points: ['Submit IT issues in 30 seconds via chat', 'Track ticket status from your phone', 'Get notified when your lab PC is fixed', 'No IT jargon — just plain English'],
              },
              {
                icon: '🛠️', role: 'IT Staff & Agents', color: '#f59e0b',
                points: ['See all tickets in a live dashboard', 'Tickets auto-assigned based on category', 'Comment, escalate, and resolve together', 'Activity log for full audit trail'],
              },
              {
                icon: '📊', role: 'Admins & Managers', color: '#22c55e',
                points: ['Analytics & resolution rate reports', 'Manage user roles and permissions', 'SLA visibility and priority alerts', 'Export data for compliance reports'],
              },
            ].map(({ icon, role, color, points }) => (
              <div key={role} className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5 hover:border-[#3f3f46] transition-colors">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[24px] mb-4" style={{ backgroundColor: `${color}15`, border: `1px solid ${color}25` }}>
                  {icon}
                </div>
                <h3 className="text-[14px] font-semibold text-[#fafafa] mb-3">{role}</h3>
                <ul className="space-y-2">
                  {points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2 text-[12px] text-[#a1a1aa]">
                      <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tech stack (college demo section) ─────────────────────────────── */}
      <div className="py-12 border-t border-[#27272a]">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <p className="text-[11px] text-[#52525b] font-semibold uppercase tracking-widest mb-2">Technology Stack</p>
            <h2 className="text-[18px] font-bold text-[#fafafa]">Built with modern, production-grade tools</h2>
          </div>
          <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
            {[
              { name: 'React 19',       color: '#61dafb', bg: '#0d2137' },
              { name: 'Vite',           color: '#f59e0b', bg: '#1a1300' },
              { name: 'Tailwind CSS',   color: '#06b6d4', bg: '#031b23' },
              { name: 'Node.js',        color: '#22c55e', bg: '#0a1f0d' },
              { name: 'Express.js',     color: '#a1a1aa', bg: '#1a1a1a' },
              { name: 'MongoDB Atlas',  color: '#4db33d', bg: '#0a1a09' },
              { name: 'JWT Auth',       color: '#f97316', bg: '#1a0e03' },
              { name: '2FA (TOTP/OTP)', color: '#a855f7', bg: '#130d1a' },
              { name: 'REST API',       color: '#3b82f6', bg: '#030d1a' },
              { name: 'Role-Based AC',  color: '#ec4899', bg: '#1a0310' },
            ].map(({ name, color, bg }) => (
              <div key={name} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#27272a] text-[12px] font-medium" style={{ backgroundColor: bg, color }}>
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Survey CTA ────────────────────────────────────────────────────── */}
      <div className="py-16 border-t border-[#27272a] bg-[#0d0d0f]">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center bg-gradient-to-br from-[#f59e0b]/8 to-[#3b82f6]/8 border border-[#f59e0b]/15 rounded-2xl p-8 sm:p-10">
            <div className="w-12 h-12 bg-[#f59e0b]/15 border border-[#f59e0b]/25 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </div>
            <h2 className="text-[20px] sm:text-[22px] font-bold text-[#fafafa] mb-2">Tell us what you think</h2>
            <p className="text-[13px] text-[#a1a1aa] mb-6 leading-relaxed max-w-sm mx-auto">
              We're building HiTicket based on real feedback. Take our 2-minute survey and help us shape the product — no account needed.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/survey"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#f59e0b] hover:bg-[#d97706] text-[#09090b] text-[14px] font-semibold rounded-xl transition-colors shadow-lg shadow-[#f59e0b]/20"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                Take the Survey →
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#18181b] border border-[#27272a] hover:bg-[#1c1c1f] text-[#fafafa] text-[14px] font-medium rounded-xl transition-colors"
              >
                Sign In / Register
              </Link>
            </div>
            <p className="mt-4 text-[11px] text-[#3f3f46]">8 questions · Anonymous · Results help improve HiTicket</p>
          </div>
        </div>
      </div>

      {/* ── Final CTA Banner ──────────────────────────────────────────────── */}
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
            <Button variant="primary" size="lg" onClick={() => navigate('/login')}>
              Get Started Free
            </Button>
          </div>
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div className="border-t border-[#27272a] py-8">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-[#3b82f6] rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2m-4 9.5a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1m8 0a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1M3 15h18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1Z" />
                </svg>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#fafafa]">HiTicket</p>
                <p className="text-[11px] text-[#52525b]">AI-Powered IT Helpdesk &copy; 2026</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[12px] text-[#52525b]">
              <Link to="/survey" className="hover:text-[#f59e0b] transition-colors">Take Our Survey</Link>
              <Link to="/status" className="hover:text-[#a1a1aa] transition-colors">System Status</Link>
              <Link to="/login"  className="hover:text-[#a1a1aa] transition-colors">Sign In</Link>
              <a href="#" className="hover:text-[#a1a1aa] transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-[#a1a1aa] transition-colors">Contact Support</a>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default Home;
