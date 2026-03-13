import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import Button from '../components/ui/Button';
import api from '../api/api';

const features = [
  {
    icon: (
      <svg className="w-5 h-5 text-[#3b82f6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Instant Ticket Creation',
    desc: 'Submit tickets in under 30 seconds via a guided AI chat.',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-[#6366f1]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
      </svg>
    ),
    title: 'AI-Powered Routing',
    desc: 'Auto-categorise and assign tickets to the right team instantly.',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-[#06b6d4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Real-Time Dashboard',
    desc: 'Track all open tickets and agent activity in a live dashboard.',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    title: 'Smart Notifications',
    desc: 'Get notified on every status change — email, push, or in-app.',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: 'Team Collaboration',
    desc: 'Assign, comment, and resolve tickets together as a team.',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-[#ec4899]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
      </svg>
    ),
    title: 'Analytics & Reports',
    desc: 'Weekly summaries and resolution metrics for your IT team.',
  },
];

const avatarColors = ['#3b82f6', '#6366f1', '#22c55e', '#f59e0b'];
const avatarInitials = ['JD', 'MP', 'AR', 'SK'];

const Home = () => {
  const navigate = useNavigate();
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  const userName = localStorage.getItem('userName') || '';
  const userRole = localStorage.getItem('userRole') || 'user';
  const firstName = userName.split(' ')[0] || 'there';

  const [myStats, setMyStats] = useState(null);
  const [recentTickets, setRecentTickets] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    setStatsLoading(true);
    api.get('/tickets')
      .then(({ data }) => {
        const tickets = data.tickets || [];
        setRecentTickets(tickets.slice(0, 3));
        setMyStats({
          total: tickets.length,
          open: tickets.filter((t) => t.status === 'Open').length,
          inProgress: tickets.filter((t) => t.status === 'In Progress').length,
          resolved: tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length,
        });
      })
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, [isAuthenticated]);

  const STATUS_DOT = {
    'Open': 'bg-[#22c55e]',
    'In Progress': 'bg-[#f59e0b]',
    'Resolved': 'bg-[#3b82f6]',
    'Closed': 'bg-[#52525b]',
  };

  if (isAuthenticated) {
    return (
      <PageWrapper>
        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Welcome header */}
          <div className="mb-8 animate-fade-in">
            <p className="text-[13px] text-[#52525b] mb-1">Welcome back</p>
            <h1 className="text-[26px] font-semibold text-[#fafafa]">Hi, {firstName} 👋</h1>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { label: 'New Ticket', icon: 'M12 4v16m8-8H4', color: '#3b82f6', path: '/chatbot' },
              { label: 'My Tickets', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', color: '#6366f1', path: '/my-tickets' },
              { label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', color: '#22c55e', path: '/profile' },
              userRole === 'admin'
                ? { label: 'Admin Panel', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: '#f59e0b', path: '/admin' }
                : { label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', color: '#a855f7', path: '/settings' },
            ].map(({ label, icon, color, path }) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                className="flex flex-col items-center gap-2.5 py-5 px-3 bg-[#18181b] border border-[#27272a] rounded-xl hover:border-[#3f3f46] hover:bg-[#1c1c1f] transition-all text-center group"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                  <svg className="w-4.5 h-4.5" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                  </svg>
                </div>
                <span className="text-[12.5px] font-medium text-[#a1a1aa] group-hover:text-[#fafafa] transition-colors">{label}</span>
              </button>
            ))}
          </div>

          {/* Stats row */}
          {statsLoading ? (
            <div className="h-24 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#3b82f6] animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            </div>
          ) : myStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {[
                { label: 'Total', value: myStats.total, color: '#a1a1aa' },
                { label: 'Open', value: myStats.open, color: '#22c55e' },
                { label: 'In Progress', value: myStats.inProgress, color: '#f59e0b' },
                { label: 'Resolved', value: myStats.resolved, color: '#3b82f6' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-4 text-center">
                  <div className="text-[26px] font-bold" style={{ color }}>{value}</div>
                  <div className="text-[12px] text-[#52525b] mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Recent tickets */}
          {recentTickets.length > 0 && (
            <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[14px] font-semibold text-[#fafafa]">Recent Tickets</h2>
                <button onClick={() => navigate('/my-tickets')} className="text-[12px] text-[#3b82f6] hover:underline">View all</button>
              </div>
              <div className="space-y-2">
                {recentTickets.map((t) => (
                  <button
                    key={t._id}
                    onClick={() => navigate(`/tickets/${t._id}`)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[#27272a] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[t.status] || 'bg-zinc-500'}`} />
                      <span className="text-[13px] text-[#fafafa] truncate">{t.title}</span>
                    </div>
                    <span className="text-[11px] font-['JetBrains_Mono'] text-[#52525b] ml-3 flex-shrink-0">{t.ticketId || ''}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {myStats?.total === 0 && !statsLoading && (
            <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#27272a] flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-[#52525b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
              </div>
              <p className="text-[14px] text-[#fafafa] mb-1">No tickets yet</p>
              <p className="text-[13px] text-[#52525b] mb-4">Raise your first support request using the AI chatbot.</p>
              <Button variant="primary" onClick={() => navigate('/chatbot')}>Raise a Ticket</Button>
            </div>
          )}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 pt-16 pb-20">
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
      <div className="border-y border-[#27272a] py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-3 gap-8">
            {[
              { value: '2,400+', label: 'Tickets Resolved', icon: <svg className="w-5 h-5 text-[#3b82f6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
              { value: '98%', label: 'User Satisfaction', icon: <svg className="w-5 h-5 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
              { value: '< 2hrs', label: 'Avg Resolution Time', icon: <svg className="w-5 h-5 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
            ].map(({ value, label, icon }, i) => (
              <div key={i} className={`text-center ${i === 1 ? 'border-x border-[#27272a]' : ''}`}>
                <div className="flex justify-center mb-2">{icon}</div>
                <div className="font-bold text-[32px] text-[#fafafa] mb-1">{value}</div>
                <div className="text-[13px] text-[#52525b]">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-[24px] font-semibold text-[#fafafa] mb-2">Everything your IT team needs</h2>
            <p className="text-[14px] text-[#a1a1aa] max-w-md mx-auto">
              Streamline your support workflow with intelligent automation and real-time tracking
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div key={i} className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 hover:border-[#3f3f46] hover:bg-[#1c1c1f] transition-all duration-200 group">
                <div className="w-9 h-9 bg-[#27272a] rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#3f3f46] transition-colors">
                  {f.icon}
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
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="bg-gradient-to-r from-[#3b82f6]/10 to-[#6366f1]/10 border border-[#3b82f6]/20 rounded-2xl p-10">
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
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-[13px] text-[#52525b]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#3b82f6] rounded-md flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2m-4 9.5a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1m8 0a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1M3 15h18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1Z" />
              </svg>
            </div>
            <span>HelpDesk AI &copy; 2026</span>
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
