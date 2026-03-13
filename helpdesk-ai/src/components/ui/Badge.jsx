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
    // Status variants
    'open': 'bg-[rgba(34,197,94,0.1)] text-[#22c55e] border border-[rgba(34,197,94,0.2)]',
    'in-progress': 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b] border border-[rgba(245,158,11,0.2)]',
    'resolved': 'bg-[rgba(6,182,212,0.1)] text-[#06b6d4] border border-[rgba(6,182,212,0.2)]',
    'closed': 'bg-[rgba(82,82,91,0.2)] text-[#71717a] border border-[rgba(82,82,91,0.3)]',
    
    // Priority variants
    'critical': 'bg-[rgba(239,68,68,0.1)] text-[#ef4444] border border-[rgba(239,68,68,0.2)]',
    'high': 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b] border border-[rgba(245,158,11,0.2)]',
    'medium': 'bg-[rgba(59,130,246,0.1)] text-[#3b82f6] border border-[rgba(59,130,246,0.2)]',
    'low': 'bg-[rgba(34,197,94,0.1)] text-[#22c55e] border border-[rgba(34,197,94,0.2)]',
    
    // Info variant
    'info': 'bg-[rgba(6,182,212,0.1)] text-[#06b6d4] border border-[rgba(6,182,212,0.2)]',
    
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
