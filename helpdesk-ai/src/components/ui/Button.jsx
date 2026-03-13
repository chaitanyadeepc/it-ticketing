import React from 'react';
import PropTypes from 'prop-types';

/**
 * Button Component — Enterprise Design System
 * Variants: primary, secondary, ghost, danger, outline
 * Sizes: sm (28px), md (34px), lg (40px)
 */
const Button = ({ 
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled = false,
  loading = false,
  type = 'button',
  onClick,
  ...props 
}) => {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]';
  
  const variants = {
    primary: 'bg-[#3b82f6] text-white hover:bg-[#2563eb] rounded-md',
    secondary: 'bg-[#27272a] text-[#fafafa] border border-[#3f3f46] hover:bg-[#3f3f46] rounded-md',
    ghost: 'bg-transparent text-[#a1a1aa] hover:bg-[#18181b] hover:text-[#fafafa] rounded-md',
    danger: 'bg-[#ef4444] text-white hover:bg-[#dc2626] rounded-md',
    outline: 'bg-transparent border border-[#3b82f6] text-[#3b82f6] hover:bg-[rgba(59,130,246,0.08)] rounded-md'
  };
  
  const sizes = {
    sm: 'h-7 px-3 text-[13px]',
    md: 'h-[34px] px-[14px] text-[13px]',
    lg: 'h-10 px-5 text-[14px]'
  };

  return (
    <button
      type={type}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : children}
    </button>
  );
};

Button.propTypes = {
  variant: PropTypes.oneOf(['primary', 'secondary', 'ghost', 'danger', 'outline']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  type: PropTypes.string,
  onClick: PropTypes.func
};

export default Button;
