import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useScrollHide } from '../../hooks/useScrollHide';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/api';
import LogoMark from '../ui/LogoMark';
import { logActivity } from '../../utils/activityLog';

const SunIcon = () => (
  <svg className="w-[17px] h-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <circle cx="12" cy="12" r="5"/>
    <path strokeLinecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
  </svg>
);

const MoonIcon = () => (
  <svg className="w-[17px] h-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

// ── Icon library for nav items ───────────────────────────────────────────────
const NavIcon = ({ id, className = 'w-4 h-4' }) => {
  const icons = {
    home:      'M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z M9 21V12h6v9',
    chat:      'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
    tickets:   'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
    search:    'M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z',
    book:      'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    dashboard: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z M14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z M4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z M14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
    users:     'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    log:       'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6M9 16h4',
    survey:    'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    megaphone: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.952 9.168-4.752v14.752l-9.168-4.752z',
    template:  'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
    reports:   'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    clock:     'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    calendar:  'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    code:      'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  };
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      {icons[id]?.split(' M').map((d, i) => (
        <path key={i} strokeLinecap="round" strokeLinejoin="round" d={(i === 0 ? '' : 'M') + d} />
      ))}
    </svg>
  );
};

// ── Desktop dropdown panel ───────────────────────────────────────────────────
const NavDropdown = ({ items, onNavigate, currentPath }) => {
  // Most-specific match wins: the item with the longest path that is a prefix
  // of (or exactly equals) the current path is the only one shown as active.
  // This prevents /admin from staying active when navigating to /admin/users.
  const activeItem = items.reduce((best, item) => {
    if (currentPath === item.path || currentPath.startsWith(item.path + '/')) {
      if (!best || item.path.length > best.path.length) return item;
    }
    return best;
  }, null);

  return (
  <div
    className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-64 rounded-xl shadow-2xl shadow-black/40 border overflow-hidden z-50 animate-fade-in"
    style={{ backgroundColor: 'var(--color-canvas-overlay)', borderColor: 'var(--color-border-default)' }}
  >
    <div className="p-1.5 space-y-0.5">
      {items.map((item) => {
        const isActive = activeItem?.path === item.path;
        return (
          <button
            key={item.path}
            onClick={() => onNavigate(item.path)}
            className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all group ${
              isActive
                ? 'bg-[#FF634A]/10'
                : 'hover:bg-[rgba(255,255,255,0.06)]'
            }`}
          >
            <span className={`mt-0.5 flex-shrink-0 ${isActive ? 'text-[#FF634A]' : 'text-[rgba(255,255,255,0.45)] group-hover:text-[rgba(255,255,255,0.8)]'} transition-colors`}>
              <NavIcon id={item.icon} className="w-4 h-4" />
            </span>
            <div>
              <p className={`text-[13px] font-medium leading-none mb-0.5 ${isActive ? 'text-[#FF634A]' : 'text-[rgba(255,255,255,0.85)] group-hover:text-white'} transition-colors`}>
                {item.name}
              </p>
              {item.desc && (
                <p className="text-[11px] text-[rgba(255,255,255,0.38)] group-hover:text-[rgba(255,255,255,0.55)] transition-colors leading-snug">
                  {item.desc}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  </div>
  );
};

// ── Chevron icon ─────────────────────────────────────────────────────────────
const Chevron = ({ open }) => (
  <svg
    className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const Navbar = () => {
  const [openDropdown, setOpenDropdown] = useState(null); // key of open desktop dropdown
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [hasSharedSnippets, setHasSharedSnippets] = useState(false);
  const navRef = useRef(null);
  const bellRef = useRef(null);
  const avatarRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isVisible = useScrollHide();
  const { toggleTheme, isDark } = useTheme();

  // Close all dropdowns when route changes
  useEffect(() => {
    setOpenDropdown(null);
    setIsBellOpen(false);
    setIsAvatarOpen(false);
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Fetch recent ticket updates for notifications
  useEffect(() => {
    const isAuth = !!localStorage.getItem('token') && localStorage.getItem('isAuthenticated') === 'true';
    if (!isAuth) return;
    const fetchNotifications = async () => {
      try {
        const [ticketRes, overdueRes] = await Promise.all([
          api.get('/tickets?limit=5'),
          api.get('/tickets?overdue=true'),
        ]);
        const tickets = ticketRes.data.tickets || [];
        const recent = tickets
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
          .slice(0, 5)
          .map(t => ({
            id: t._id,
            title: t.title,
            status: t.status,
            ticketId: t.ticketId || t._id.slice(-6).toUpperCase(),
            updatedAt: t.updatedAt,
          }));
        const stored = JSON.parse(sessionStorage.getItem('hd_read_notifs') || '[]');
        setNotifications(recent);
        setUnreadCount(recent.filter(n => !stored.includes(n.id)).length);
        setOverdueCount((overdueRes.data.tickets || []).length);
      } catch { /* silent */ }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  // Check if current user has any snippets shared with them
  useEffect(() => {
    const isAuth = !!localStorage.getItem('token') && localStorage.getItem('isAuthenticated') === 'true';
    if (!isAuth) return;
    api.get('/codeshare/has-access')
      .then(({ data }) => setHasSharedSnippets(data.hasAccess))
      .catch(() => setHasSharedSnippets(false));
  }, [location.pathname]);

  const markAllRead = () => {
    const ids = notifications.map(n => n.id);
    sessionStorage.setItem('hd_read_notifs', JSON.stringify(ids));
    setUnreadCount(0);
  };

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date);
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  useEffect(() => {
    const handler = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenDropdown(null);
      if (bellRef.current && !bellRef.current.contains(e.target)) setIsBellOpen(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target)) setIsAvatarOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  if (location.pathname === '/login') return null;
  if (location.pathname === '/survey') return null;
  if (location.pathname === '/' && !localStorage.getItem('token')) return null;

  const isAdmin = localStorage.getItem('userRole') === 'admin';
  const isAgent = localStorage.getItem('userRole') === 'agent';

  // ── Role-based nav groups ─────────────────────────────────────────────────
  // shape: { label, path?, key?, items? }
  //   - path → direct link (no dropdown)
  //   - key + items → dropdown
  const navGroups = [
    { label: 'Home', path: '/', icon: 'home' },
    {
      label: 'Support',
      key: 'support',
      items: [
        { name: 'AI Assistant',   path: '/raise-ticket',        desc: 'Raise a ticket with AI guidance',       icon: 'chat' },
        { name: 'My Tickets',     path: '/my-tickets',          desc: 'View and manage your open tickets',     icon: 'tickets' },
        { name: 'Calendar',       path: '/my-tickets/calendar', desc: 'View tickets by due date',              icon: 'calendar' },
        ...(hasSharedSnippets && !isAdmin && !isAgent ? [
          { name: 'Script Vault', path: '/codeshare', desc: 'Scripts & code shared with you', icon: 'code' },
        ] : []),
      ],
    },
    { label: 'Knowledge Base', path: '/knowledge-base', icon: 'book' },
    ...(isAdmin ? [{
      label: 'Admin',
      key: 'admin',
      items: [
        { name: 'Dashboard',       path: '/admin',                    desc: 'Tickets, analytics & team overview',    icon: 'dashboard' },
        { name: 'User Management', path: '/admin/users',              desc: 'Manage staff and user accounts',        icon: 'users' },
        { name: 'Activity Log',    path: '/admin/logs',               desc: 'System events and audit trail',         icon: 'log' },
        { name: 'Survey Results',  path: '/admin/feedback',           desc: 'User satisfaction and feedback scores', icon: 'survey' },
        { name: 'Announcements',   path: '/admin/announcements',      desc: 'Manage site-wide banners',              icon: 'megaphone' },
        { name: 'Canned Responses',path: '/admin/canned-responses',   desc: 'Shared reply templates for agents',     icon: 'template' },
        { name: 'Reports',         path: '/reports',                  desc: 'Advanced analytics & downloadable reports', icon: 'reports' },
        { name: 'SLA Config',      path: '/admin/sla-config',         desc: 'Configure response time targets',       icon: 'clock' },
        { name: 'Script Vault',     path: '/admin/codeshare',          desc: 'Scripts, configs & code snippets',       icon: 'code' },
      ],
    }] : isAgent ? [{
      label: 'Staff',
      key: 'staff',
      items: [
        { name: 'Dashboard',        path: '/admin',                   desc: 'Tickets overview & analytics',          icon: 'dashboard' },
        { name: 'Reports',          path: '/reports',                 desc: 'Advanced analytics & reports',          icon: 'reports' },
        { name: 'Canned Responses', path: '/admin/canned-responses',  desc: 'Shared reply templates',                icon: 'template' },
        ...(hasSharedSnippets ? [
          { name: 'Script Vault',    path: '/codeshare',              desc: 'Scripts & code shared with you',        icon: 'code' },
        ] : []),
      ],
    }] : []),
  ];

  const handleLogout = () => {
    logActivity('USER_LOGOUT', {
      category: 'AUTH', severity: 'info',
      detail: `${localStorage.getItem('userEmail') || 'user'} signed out`,
      metadata: { email: localStorage.getItem('userEmail'), role: localStorage.getItem('userRole') },
    });
    ['isAuthenticated', 'userEmail', 'userName', 'userRole', 'token', 'userId'].forEach(k => localStorage.removeItem(k));
    navigate('/login');
  };

  const userEmail = localStorage.getItem('userEmail') || 'user@company.com';
  const userName  = localStorage.getItem('userName') || '';
  const initials  = userName
    ? userName.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : userEmail.slice(0, 2).toUpperCase();

  const toggle = (key) => setOpenDropdown(prev => (prev === key ? null : key));

  // Is any item in a group currently active?
  const groupActive = (group) => {
    if (group.path) return location.pathname === group.path;
    return group.items?.some(it => location.pathname === it.path || location.pathname.startsWith(it.path + '/'));
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-sm border-b border-[#27272a] transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}
      style={{ backgroundColor: 'var(--color-header-bg)' }}
      ref={navRef}
    >
      <div className="w-full px-6 xl:px-10">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link to="/"><LogoMark size="lg" /></Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-0.5">
            {navGroups.map((group) => {
              const active = groupActive(group);

              // Direct link
              if (group.path) {
                return (
                  <Link
                    key={group.path}
                    to={group.path}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all duration-75 ${
                      active
                        ? 'text-[#FF634A] font-semibold'
                        : 'text-[rgba(255,255,255,0.7)] hover:text-white hover:bg-[rgba(255,255,255,0.08)]'
                    }`}
                  >
                    {group.label}
                  </Link>
                );
              }

              // Dropdown
              const isOpen = openDropdown === group.key;
              return (
                <div key={group.key} className="relative">
                  <button
                    onClick={() => toggle(group.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all duration-75 ${
                      active || isOpen
                        ? 'text-[#FF634A] bg-[#FF634A]/8'
                        : 'text-[rgba(255,255,255,0.7)] hover:text-white hover:bg-[rgba(255,255,255,0.08)]'
                    }`}
                  >
                    {group.label}
                    <Chevron open={isOpen} />
                  </button>
                  {isOpen && (
                    <NavDropdown
                      items={group.items}
                      currentPath={location.pathname}
                      onNavigate={(path) => { navigate(path); setOpenDropdown(null); }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1.5">

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-md text-[rgba(255,255,255,0.7)] hover:text-white hover:bg-[rgba(255,255,255,0.1)] transition-colors"
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>

            {/* Keyboard shortcuts help */}
            <button
              onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }))}
              title="Keyboard shortcuts (?)"
              className="hidden md:flex items-center justify-center w-7 h-7 rounded-md text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-colors text-[13px] font-bold"
            >
              ?
            </button>

            {/* Command palette hint */}
            <button
              onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
              title="Open command palette (⌘K)"
              className="hidden md:flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-colors text-[11px]"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
              </svg>
              <kbd className="font-mono">⌘K</kbd>
            </button>

            {/* Overdue ticket badge */}
            {overdueCount > 0 && (
              <button
                onClick={() => navigate('/my-tickets')}
                title={`${overdueCount} overdue ticket${overdueCount > 1 ? 's' : ''}`}
                className="hidden md:flex items-center gap-1 px-2 py-1 rounded-md bg-red-900/30 border border-red-700/50 text-red-400 text-[11px] font-semibold hover:bg-red-900/50 transition-colors"
              >
                ⏰ {overdueCount} overdue
              </button>
            )}

            {/* Bell */}
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => { setIsBellOpen(v => !v); if (!isBellOpen) markAllRead(); }}
                className="relative p-2 rounded-md text-[rgba(255,255,255,0.7)] hover:text-white hover:bg-[rgba(255,255,255,0.1)] transition-colors"
              >
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#ef4444] text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
                {unreadCount === 0 && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-danger-fg)' }} />
                )}
              </button>

              {isBellOpen && (
                <div className="absolute right-0 top-10 w-64 sm:w-72 rounded-xl shadow-2xl shadow-black/50 border notif-enter z-50 overflow-hidden"
                  style={{ backgroundColor: 'var(--color-canvas-overlay)', borderColor: 'var(--color-border-default)' }}>
                  <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-muted)' }}>
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--color-fg-default)' }}>Recent Updates</span>
                    <span className="text-[11px]" style={{ color: 'var(--color-fg-subtle)' }}>Last 5 tickets</span>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-[12px]" style={{ color: 'var(--color-fg-subtle)' }}>No recent activity</div>
                  ) : (
                    <div className="divide-y" style={{ borderColor: 'var(--color-border-muted)' }}>
                      {notifications.map(n => {
                        const STATUS_COLOR = { 'Open': '#22c55e', 'In Progress': '#f59e0b', 'Resolved': '#06b6d4', 'Closed': '#71717a' };
                        const col = STATUS_COLOR[n.status] || '#a1a1aa';
                        return (
                          <button key={n.id}
                            onClick={() => { navigate(`/tickets/${n.id}`); setIsBellOpen(false); }}
                            className="w-full text-left px-4 py-3 hover:bg-[rgba(255,255,255,0.04)] transition-colors">
                            <div className="flex items-start gap-2">
                              <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: col }} />
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-medium truncate" style={{ color: 'var(--color-fg-default)' }}>{n.title}</p>
                                <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-fg-subtle)' }}>
                                  <span style={{ color: col }}>{n.status}</span> · #{n.ticketId} · {timeAgo(n.updatedAt)}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="px-4 py-2.5 border-t" style={{ borderColor: 'var(--color-border-muted)' }}>
                    <button onClick={() => { navigate('/notifications'); setIsBellOpen(false); }}
                      className="text-[12px] w-full text-center" style={{ color: 'var(--color-accent-fg)' }}>
                      View notification center →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Avatar + Dropdown */}
            <div className="relative" ref={avatarRef}>
              <button
                onClick={() => setIsAvatarOpen(v => !v)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-semibold transition-colors ring-2"
                style={{ backgroundColor: 'var(--color-accent-emphasis)', ringColor: 'var(--color-accent-muted)' }}
              >
                {initials}
              </button>

              {isAvatarOpen && (
                <div className="absolute right-0 top-10 w-52 rounded-[6px] shadow-2xl shadow-black/50 p-1.5 animate-fade-in z-50 border" style={{ backgroundColor: 'var(--color-canvas-overlay)', borderColor: 'var(--color-border-default)' }}>
                  <div className="px-3 py-2 border-b mb-1" style={{ borderColor: 'var(--color-border-muted)' }}>
                    {userName && <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--color-fg-default)' }}>{userName}</p>}
                    <p className="text-[11px] text-[#a1a1aa] truncate">{userEmail}</p>
                  </div>
                  {[
                    { to: '/profile',  label: 'Profile',  d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                    { to: '/settings', label: 'Settings', d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
                  ].map(({ to, label, d }) => (
                    <Link key={to} to={to} onClick={() => setIsAvatarOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-md transition-colors hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[rgba(255,255,255,0.07)]" style={{ color: 'var(--color-fg-muted)' }}>
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={d} />
                      </svg>
                      {label}
                    </Link>
                  ))}
                  <div className="mt-1 pt-1 border-t" style={{ borderColor: 'var(--color-border-muted)' }}>
                    <button onClick={handleLogout}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg transition-colors">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-[rgba(255,255,255,0.7)] hover:text-white hover:bg-[rgba(255,255,255,0.1)] transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Drawer ─────────────────────────────────────────────────── */}
      {isMobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
          <div
            className="fixed top-16 left-0 w-72 h-[calc(100vh-4rem)] border-r z-50 md:hidden animate-slide-right flex flex-col"
            style={{ backgroundColor: 'var(--color-canvas-default)', borderColor: 'var(--color-border-default)' }}
          >
            {/* User info */}
            <div className="px-4 pt-4 pb-3 border-b" style={{ borderColor: 'var(--color-border-muted)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-semibold flex-shrink-0"
                  style={{ backgroundColor: 'var(--color-accent-emphasis)' }}>
                  {initials}
                </div>
                <div className="min-w-0">
                  {userName && <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--color-fg-default)' }}>{userName}</p>}
                  <p className="text-[11px] truncate" style={{ color: 'var(--color-fg-subtle)' }}>{userEmail}</p>
                </div>
              </div>
            </div>

            {/* Scrollable nav groups */}
            <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
              {navGroups.map((group) => {
                // Direct link group
                if (group.path) {
                  const isActive = location.pathname === group.path;
                  return (
                    <Link
                      key={group.path}
                      to={group.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors ${
                        isActive ? 'text-[#FF634A] bg-[#FF634A]/8' : ''
                      }`}
                      style={!isActive ? { color: 'var(--color-fg-muted)' } : {}}
                    >
                      <NavIcon id={group.icon} className="w-[18px] h-[18px] flex-shrink-0" />
                      {group.label}
                    </Link>
                  );
                }

                // Dropdown group — rendered as section with header
                return (
                  <div key={group.key}>
                    <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-fg-subtle)' }}>
                      {group.label}
                    </p>
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-colors ${
                              isActive ? 'text-[#FF634A] bg-[#FF634A]/8' : ''
                            }`}
                            style={!isActive ? { color: 'var(--color-fg-muted)' } : {}}
                          >
                            <NavIcon id={item.icon} className="w-[17px] h-[17px] flex-shrink-0" />
                            {item.name}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Account links */}
              <div>
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-fg-subtle)' }}>
                  Account
                </p>
                <div className="space-y-0.5">
                  {[
                    { to: '/profile',  label: 'Profile',  icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                    { to: '/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
                  ].map(({ to, label, icon }) => {
                    const isActive = location.pathname === to;
                    return (
                      <Link key={to} to={to} onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-colors ${isActive ? 'text-[#FF634A] bg-[#FF634A]/8' : ''}`}
                        style={!isActive ? { color: 'var(--color-fg-muted)' } : {}}>
                        <svg className="w-[17px] h-[17px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d={icon} />
                        </svg>
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Theme toggle */}
              <div className="border-t pt-3" style={{ borderColor: 'var(--color-border-muted)' }}>
                <button onClick={toggleTheme}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-colors"
                  style={{ color: 'var(--color-fg-muted)' }}>
                  {isDark ? <><SunIcon /><span>Light Mode</span></> : <><MoonIcon /><span>Dark Mode</span></>}
                </button>
              </div>
            </div>

            {/* Sign out footer */}
            <div className="flex-shrink-0 p-4 pb-20 border-t" style={{ borderColor: 'var(--color-border-muted)' }}>
              <button onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[13px] text-[#ef4444] border border-[#ef4444]/20 bg-[#ef4444]/5 hover:bg-[#ef4444]/10 rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </nav>
  );
};

export default Navbar;
