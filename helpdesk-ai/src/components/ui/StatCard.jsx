import React from 'react';

/**
 * StatCard Component — Clean Professional Dark
 * Statistics display card
 */
const StatCard = ({ value, label, subtitle, trend }) => {
  const trendColor = trend === 'up' ? 'text-[#22c55e]' : trend === 'down' ? 'text-[#ef4444]' : 'text-[#a1a1aa]';
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';

  return (
    <div className="card">
      <div className="mb-3">
        <div className="text-[11px] font-medium font-['JetBrains_Mono'] text-[#52525b] uppercase tracking-wider">{label}</div>
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-[32px] font-semibold text-[#fafafa]">{value}</span>
        {trend && (
          <span className={`text-xl font-medium ${trendColor}`}>{trendIcon}</span>
        )}
      </div>
      {subtitle && (
        <div className="text-[12px] font-normal text-[#a1a1aa]">{subtitle}</div>
      )}
    </div>
  );
};

export default StatCard;
