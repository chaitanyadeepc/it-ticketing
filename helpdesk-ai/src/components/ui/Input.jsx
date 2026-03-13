import React from 'react';

const Input = ({
  label,
  error,
  hint,
  prefix,
  suffix,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <div className="absolute left-3 text-[#52525b] pointer-events-none flex items-center">{prefix}</div>
        )}
        <input
          className={`w-full h-9 rounded-lg bg-[#18181b] border text-[14px] text-[#fafafa] placeholder-[#52525b]
            focus:outline-none focus:ring-2 transition-all
            ${error
              ? 'border-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]/20'
              : 'border-[#27272a] focus:border-[#3b82f6] focus:ring-[#3b82f6]/20'
            }
            ${prefix ? 'pl-9' : 'pl-3.5'}
            ${suffix ? 'pr-9' : 'pr-3.5'}
            ${className}`}
          {...props}
        />
        {suffix && (
          <div className="absolute right-3 text-[#52525b] pointer-events-none flex items-center">{suffix}</div>
        )}
      </div>
      {error && <p className="mt-1 text-[12px] text-[#ef4444]">{error}</p>}
      {hint && !error && <p className="mt-1 text-[12px] text-[#52525b]">{hint}</p>}
    </div>
  );
};

export default Input;
