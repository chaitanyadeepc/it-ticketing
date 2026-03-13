import React from 'react';

const sizeMap = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-[12px]',
  md: 'w-9 h-9 text-[13px]',
  lg: 'w-11 h-11 text-[15px]',
  xl: 'w-14 h-14 text-[18px]',
};

const Avatar = ({ name = '', size = 'md', src, online = false, className = '' }) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`relative inline-flex flex-shrink-0 ${className}`}>
      <div
        className={`${sizeMap[size]} rounded-full bg-[#3b82f6] flex items-center justify-center font-semibold text-white select-none overflow-hidden flex-shrink-0`}
      >
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          initials || '?'
        )}
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#22c55e] border-2 border-[#09090b] rounded-full" />
      )}
    </div>
  );
};

export default Avatar;
