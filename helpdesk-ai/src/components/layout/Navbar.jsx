import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useScrollHide } from '../../hooks/useScrollHide';
import { useTheme } from '../../context/ThemeContext';

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
  const dropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isVisible = useScrollHide();
  const { theme, toggleTheme, isDark } = useTheme();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      style={{ backgroundColor: isDark ? 'rgba(9,9,11,0.95)' : 'rgba(244,244,245,0.95)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-14">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 bg-[#3b82f6] rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2m-4 9.5a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1m8 0a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1M3 15h18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1Z" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold text-[#fafafa] tracking-tight">TicketFlow</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors duration-150 ${
                    isActive ? 'text-[#fafafa] bg-[#18181b]' : 'text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b]'
                  }`}
                >
                  {link.name}
                  {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[#3b82f6] rounded-full" />}
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
              className="p-2 rounded-md text-[#71717a] hover:text-[#fafafa] hover:bg-[#18181b] transition-colors"
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>

            {/* Bell */}
            <button className="relative p-2 rounded-md text-[#71717a] hover:text-[#fafafa] hover:bg-[#18181b] transition-colors">
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#f59e0b] rounded-full" />
            </button>

            {/* Avatar + Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-8 h-8 rounded-full bg-[#3b82f6] flex items-center justify-center text-white text-[12px] font-semibold hover:bg-[#2563eb] transition-colors ring-2 ring-[#3b82f6]/20"
              >
                {initials}
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 top-10 w-52 bg-[#18181b] border border-[#27272a] rounded-xl shadow-2xl shadow-black/50 p-1.5 animate-fade-in z-50">
                  <div className="px-3 py-2 border-b border-[#27272a] mb-1">
                    <p className="text-[12px] text-[#a1a1aa] truncate">{userEmail}</p>
                  </div>
                  {[
                    { to: '/profile', label: 'Profile', d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                    { to: '/my-tickets', label: 'My Tickets', d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                    { to: '/settings', label: 'Settings', d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
                  ].map(({ to, label, d }) => (
                    <Link key={to} to={to} onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#27272a] rounded-lg transition-colors">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={d} />
                      </svg>
                      {label}
                    </Link>
                  ))}
                  <div className="mt-1 pt-1 border-t border-[#27272a]">
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
              className="md:hidden p-2 rounded-md text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b] transition-colors">
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
          <div className="fixed top-14 left-0 w-64 h-[calc(100vh-3.5rem)] bg-[#09090b] border-r border-[#27272a] z-50 md:hidden animate-slide-right overflow-y-auto">
            <div className="p-4 space-y-1">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link key={link.path} to={link.path} onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors ${
                      isActive ? 'bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20' : 'text-[#a1a1aa] hover:bg-[#18181b] hover:text-[#fafafa]'
                    }`}>
                    {link.name}
                  </Link>
                );
              })}
              <div className="pt-2 mt-2 border-t border-[#27272a]">
                <button onClick={toggleTheme}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-[14px] font-medium text-[#a1a1aa] hover:bg-[#18181b] hover:text-[#fafafa] transition-colors">
                  {isDark
                    ? <><SunIcon /><span>Light Mode</span></>
                    : <><MoonIcon /><span>Dark Mode</span></>}
                </button>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#27272a]">
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
