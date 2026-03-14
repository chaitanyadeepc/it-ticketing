import React from 'react';
import PropTypes from 'prop-types';

/**
 * Badge Component — Enterprise Design System
 * Full pill shape with semi-transparent backgrounds and borders
 * Designed for status, priority, and category indicators
 */
const Badge = ({ children, variant = 'default', className = '' }) => {
  const baseClasses = 'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wide font-[\'Inter\']';
  
  const variants = {
    // Status variants — GitHub palette
    'open':        'bg-[rgba(63,185,80,0.12)] text-[#22c55e] border border-[rgba(63,185,80,0.3)]',
    'in-progress': 'bg-[rgba(210,153,34,0.12)] text-[#f59e0b] border border-[rgba(210,153,34,0.3)]',
    'resolved':    'bg-[rgba(88,166,255,0.12)] text-[#3b82f6] border border-[rgba(88,166,255,0.3)]',
    'closed':      'bg-[rgba(110,118,129,0.15)] text-[#71717a] border border-[rgba(110,118,129,0.25)]',

    // Priority variants — GitHub palette
    'critical': 'bg-[rgba(248,81,73,0.12)] text-[#ef4444] border border-[rgba(248,81,73,0.3)]',
    'high':     'bg-[rgba(210,153,34,0.12)] text-[#f59e0b] border border-[rgba(210,153,34,0.3)]',
    'medium':   'bg-[rgba(88,166,255,0.12)] text-[#3b82f6] border border-[rgba(88,166,255,0.3)]',
    'low':      'bg-[rgba(63,185,80,0.12)] text-[#22c55e] border border-[rgba(63,185,80,0.3)]',

    // Info variant
    'info': 'bg-[rgba(57,197,207,0.12)] text-[#06b6d4] border border-[rgba(57,197,207,0.3)]',

    // Default
    'default': 'bg-[#27272a] text-[#a1a1aa] border border-[#3f3f46]'
  };

  return (
    <span className={`${baseClasses} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

Badge.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf([
    'open', 'in-progress', 'resolved', 'closed',
    'critical', 'high', 'medium', 'low',
    'info', 'default'
  ]),
  className: PropTypes.string
};

export default Badge;
