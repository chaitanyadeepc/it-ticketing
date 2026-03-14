import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useScrollHide } from '../../hooks/useScrollHide';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/api';
import LogoMark from '../ui/LogoMark';

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

const Navbar = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isVisible = useScrollHide();
  const { theme, toggleTheme, isDark } = useTheme();

  // Fetch recent ticket updates for notifications
  useEffect(() => {
    const isAuth = !!localStorage.getItem('token') && localStorage.getItem('isAuthenticated') === 'true';
    if (!isAuth) return;
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/tickets?limit=5');
        const tickets = res.data.tickets || [];
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
      } catch { /* silent */ }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
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
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setIsBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  if (location.pathname === '/login') return null;

  const isAdmin = localStorage.getItem('userRole') === 'admin';

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Raise Ticket', path: '/raise-ticket' },
    { name: 'My Tickets', path: '/my-tickets' },
    ...(isAdmin ? [{ name: 'Admin', path: '/admin' }] : []),
  ];

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const userEmail = localStorage.getItem('userEmail') || 'user@company.com';
  const initials = userEmail.slice(0, 2).toUpperCase();

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-sm border-b border-[#27272a] transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}
      style={{ backgroundColor: 'var(--color-header-bg)' }}
    >
      <div className="w-full px-6 xl:px-10">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link to="/"><LogoMark size="lg" /></Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-all duration-75 ${
                    isActive
                      ? 'text-[#FF634A] font-semibold'
                      : 'text-[rgba(255,255,255,0.7)] hover:text-white hover:bg-[rgba(255,255,255,0.08)]'
                  }`}
                >
                  {link.name}
                </Link>
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
                <div className="absolute right-0 top-10 w-72 rounded-xl shadow-2xl shadow-black/50 border notif-enter z-50 overflow-hidden"
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
                    <button onClick={() => { navigate('/my-tickets'); setIsBellOpen(false); }}
                      className="text-[12px] w-full text-center" style={{ color: 'var(--color-accent-fg)' }}>
                      View all tickets →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Avatar + Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-semibold transition-colors ring-2"
                style={{ backgroundColor: 'var(--color-accent-emphasis)', ringColor: 'var(--color-accent-muted)' }}
              >
                {initials}
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 top-10 w-52 rounded-[6px] shadow-2xl shadow-black/50 p-1.5 animate-fade-in z-50 border" style={{ backgroundColor: 'var(--color-canvas-overlay)', borderColor: 'var(--color-border-default)' }}>
                  <div className="px-3 py-2 border-b mb-1" style={{ borderColor: 'var(--color-border-muted)' }}>
                    <p className="text-[12px] text-[#a1a1aa] truncate">{userEmail}</p>
                  </div>
                  {[
                    { to: '/profile', label: 'Profile', d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                    { to: '/my-tickets', label: 'My Tickets', d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                    { to: '/settings', label: 'Settings', d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
                  ].map(({ to, label, d }) => (
                    <Link key={to} to={to} onClick={() => setIsDropdownOpen(false)}
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

            {/* Mobile toggle */}
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

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed top-16 left-0 w-64 h-[calc(100vh-4rem)] border-r z-50 md:hidden animate-slide-right flex flex-col" style={{ backgroundColor: 'var(--color-canvas-default)', borderColor: 'var(--color-border-default)' }}>
            {/* Scrollable nav links */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1 pb-2">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link key={link.path} to={link.path} onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-2.5 rounded-md text-[14px] font-medium transition-colors ${isActive ? 'font-semibold' : ''}`}
                    style={isActive ? { color: 'var(--color-fg-default)', backgroundColor: 'var(--color-neutral-subtle)' } : { color: 'var(--color-fg-muted)' }}>
                    {link.name}
                  </Link>
                );
              })}
              <div className="pt-2 mt-2 border-t" style={{ borderColor: 'var(--color-border-muted)' }}>
                <button onClick={toggleTheme}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md text-[14px] font-medium transition-colors"
                  style={{ color: 'var(--color-fg-muted)' }}>
                  {isDark
                    ? <><SunIcon /><span>Light Mode</span></>
                    : <><MoonIcon /><span>Dark Mode</span></>}
                </button>
              </div>
            </div>
            {/* Footer — sits above BottomNav (pb accounts for 64px bottom bar) */}
            <div className="flex-shrink-0 p-4 pb-20 border-t" style={{ borderColor: 'var(--color-border-muted)' }}>
              <p className="text-[11px] text-[#52525b] mb-3 truncate">{userEmail}</p>
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
