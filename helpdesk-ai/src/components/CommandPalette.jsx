import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const COMMANDS = [
  { id: 'home',       label: 'Go to Home',           shortcut: null, path: '/',            icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'tickets',    label: 'My Tickets',            shortcut: null, path: '/my-tickets',  icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'raise',      label: 'Raise New Ticket',      shortcut: null, path: '/raise-ticket', icon: 'M12 4v16m8-8H4' },
  { id: 'admin',      label: 'Admin Dashboard',       shortcut: null, path: '/admin',        icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', adminOnly: true },
  { id: 'profile',    label: 'Profile',               shortcut: null, path: '/profile',      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 'settings',   label: 'Settings',              shortcut: null, path: '/settings',     icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

const CommandPalette = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const isAdmin = localStorage.getItem('userRole') === 'admin';

  const filtered = COMMANDS
    .filter(c => !c.adminOnly || isAdmin)
    .filter(c => !query || c.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const execute = (cmd) => {
    navigate(cmd.path);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(s => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(s => Math.max(s - 1, 0));
    } else if (e.key === 'Enter' && filtered[selected]) {
      execute(filtered[selected]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl shadow-2xl shadow-black/70 palette-enter overflow-hidden"
        style={{ backgroundColor: 'var(--color-canvas-overlay)', border: '1px solid var(--color-border-default)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-default)' }}>
          <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-fg-subtle)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent text-[14px] outline-none placeholder-[#52525b]"
            style={{ color: 'var(--color-fg-default)' }}
          />
          <kbd className="px-2 py-0.5 rounded text-[10px] font-mono border" style={{ color: 'var(--color-fg-subtle)', borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-canvas-inset)' }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="py-1.5 max-h-72 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-[13px]" style={{ color: 'var(--color-fg-subtle)' }}>
              No commands match "{query}"
            </div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                onMouseEnter={() => setSelected(i)}
                onClick={() => execute(cmd)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                style={{
                  backgroundColor: i === selected ? 'var(--color-neutral-muted)' : 'transparent',
                  color: 'var(--color-fg-default)',
                }}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: i === selected ? 'var(--color-accent-muted)' : 'var(--color-neutral-subtle)' }}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}
                    style={{ color: i === selected ? 'var(--color-accent-fg)' : 'var(--color-fg-muted)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={cmd.icon} />
                  </svg>
                </div>
                <span className="text-[13px]">{cmd.label}</span>
                {i === selected && (
                  <kbd className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-mono border" style={{ color: 'var(--color-fg-subtle)', borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-canvas-inset)' }}>
                    ↵
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-3 px-4 py-2 border-t text-[11px]" style={{ borderColor: 'var(--color-border-muted)', color: 'var(--color-fg-subtle)' }}>
          <span><kbd className="px-1 rounded border text-[10px]" style={{ borderColor: 'var(--color-border-default)' }}>↑↓</kbd> navigate</span>
          <span><kbd className="px-1 rounded border text-[10px]" style={{ borderColor: 'var(--color-border-default)' }}>↵</kbd> open</span>
          <span><kbd className="px-1 rounded border text-[10px]" style={{ borderColor: 'var(--color-border-default)' }}>ESC</kbd> close</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
