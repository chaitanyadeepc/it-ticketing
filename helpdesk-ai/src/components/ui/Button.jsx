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
    primary:   'rounded-md border border-transparent',
    secondary: 'rounded-md border',
    ghost:     'bg-transparent rounded-md border border-transparent',
    danger:    'rounded-md border',
    outline:   'bg-transparent rounded-md border border-[var(--color-accent-emphasis)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-subtle)]'
  };

  // Inline styles for variants that need CSS custom properties
  const variantStyles = {
    primary:   { backgroundColor: 'var(--color-btn-primary-bg)', color: 'var(--color-fg-on-emphasis)' },
    secondary: { backgroundColor: 'var(--color-btn-bg)', borderColor: 'var(--color-btn-border)', color: 'var(--color-fg-default)' },
    ghost:     { color: 'var(--color-fg-muted)' },
    danger:    { backgroundColor: 'var(--color-btn-bg)', borderColor: 'var(--color-btn-border)', color: 'var(--color-danger-fg)' },
    outline:   {},
  };
  
  const sizes = {
    sm: 'h-7 px-3 text-[13px]',
    md: 'h-[34px] px-[14px] text-[13px]',
    lg: 'h-10 px-5 text-[14px]'
  };

  return (
    <button
      type={type}
      style={variantStyles[variant]}
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
