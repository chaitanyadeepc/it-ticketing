import React from 'react';

/**
 * Card Component — Clean Professional Dark
 * Solid surface with border-based hover states
 */
const Card = ({ children, className = '', onClick }) => {
  const baseClasses = 'card';
  const clickable = onClick ? 'cursor-pointer' : '';

  return (
    <div
      className={`${baseClasses} ${clickable} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;
