import React from 'react';

/**
 * PageWrapper Component
 * Wraps all page components
 */
const PageWrapper = ({ children, className = '' }) => {
  return (
    <div className={className}>
      {children}
    </div>
  );
};

export default PageWrapper;
