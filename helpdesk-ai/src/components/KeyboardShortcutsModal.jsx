import React, { useEffect } from 'react';

const SECTIONS = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Open Command Palette' },
      { keys: ['⌘', 'N'], description: 'New ticket / Open chatbot' },
      { keys: ['G', 'H'], description: 'Go to Home' },
      { keys: ['G', 'T'], description: 'Go to My Tickets' },
      { keys: ['G', 'K'], description: 'Go to Knowledge Base' },
      { keys: ['G', 'P'], description: 'Go to Profile' },
    ],
  },
  {
    title: 'Chatbot',
    shortcuts: [
      { keys: ['/status'],   description: 'Check ticket status' },
      { keys: ['/agent'],    description: 'Request human agent' },
      { keys: ['/template'], description: 'Browse ticket templates' },
      { keys: ['/kb'],       description: 'Search Knowledge Base' },
      { keys: ['/clear'],    description: 'Clear chat history' },
      { keys: ['Esc'],       description: 'Cancel current step' },
    ],
  },
  {
    title: 'General',
    shortcuts: [
      { keys: ['?'],      description: 'Show this help modal' },
      { keys: ['Esc'],    description: 'Close any modal / dialog' },
      { keys: ['Tab'],    description: 'Navigate interactive elements' },
      { keys: ['Enter'],  description: 'Confirm / Submit' },
    ],
  },
];

const Kbd = ({ children }) => (
  <span
    className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-mono font-semibold"
    style={{
      backgroundColor: 'var(--bg)',
      border: '1px solid var(--border)',
      color: 'var(--text-primary)',
      boxShadow: '0 1px 0 var(--border)',
      minWidth: children.length > 3 ? undefined : 22,
    }}
  >
    {children}
  </span>
);

const KeyboardShortcutsModal = ({ onClose }) => {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl shadow-2xl"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div
          className="sticky top-0 flex items-center justify-between px-6 py-4 rounded-t-2xl"
          style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>⌨️ Keyboard Shortcuts</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Press <Kbd>Esc</Kbd> or <Kbd>?</Kbd> to toggle this panel</p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl leading-none"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-6">
          {SECTIONS.map(section => (
            <div key={section.title}>
              <h3
                className="text-xs font-bold uppercase tracking-widest mb-3"
                style={{ color: 'var(--text-secondary)' }}
              >
                {section.title}
              </h3>
              <div className="space-y-2">
                {section.shortcuts.map(({ keys, description }) => (
                  <div key={description} className="flex items-center justify-between gap-4">
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{description}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {keys.map((k, i) => (
                        <React.Fragment key={i}>
                          <Kbd>{k}</Kbd>
                          {i < keys.length - 1 && (
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-3 rounded-b-2xl"
          style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}
        >
          <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
            On macOS use <Kbd>⌘</Kbd> — on Windows/Linux use <Kbd>Ctrl</Kbd>
          </p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
