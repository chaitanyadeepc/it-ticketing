import React from 'react';
import { useScrollTop } from '../../hooks/useScrollTop';

/**
 * ScrollToTop Component
 * Floating scroll-to-top button
 */
const ScrollToTop = () => {
  const { isVisible, scrollToTop } = useScrollTop();

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-24 md:bottom-8 right-6 z-40 w-9 h-9 bg-[#18181b] hover:bg-[#27272a] text-[#a1a1aa] hover:text-[#fafafa] rounded-full border border-[#27272a] transition-colors duration-200 animate-fade-in flex items-center justify-center"
      aria-label="Scroll to top"
    >
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 10l7-7m0 0l7 7m-7-7v18"
        />
      </svg>
    </button>
  );
};

export default ScrollToTop;
