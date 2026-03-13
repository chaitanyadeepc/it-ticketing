import React from 'react';

const EmptyState = ({ icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && (
        <div className="w-14 h-14 rounded-xl bg-[#27272a] flex items-center justify-center mb-5">
          {icon}
        </div>
      )}
      <h3 className="text-[15px] font-semibold text-[#fafafa] mb-2">{title}</h3>
      {description && (
        <p className="text-[13px] text-[#52525b] max-w-xs mb-6 leading-relaxed">{description}</p>
      )}
      {action && action}
    </div>
  );
};

export default EmptyState;
