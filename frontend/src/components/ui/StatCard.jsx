import React from 'react';

/**
 * StatCard — matches Image 1 card styling.
 * On mobile (especially when showing 8 cards), shows compact mode.
 */
export default function StatCard({ title, value, icon: Icon, color = 'blue', badgeText, badgeType = 'green', subtitle }) {
  const colorMap = {
    blue:   'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    green:  'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    red:    'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
  };

  return (
    <div className="stat-card p-3 md:p-5">
      <div className="flex items-start justify-between gap-1">
        <div className="space-y-0.5 min-w-0">
          <p className="text-[10px] xl:text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 leading-tight">
            {title}
          </p>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <h3 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
              {value}
            </h3>
            {badgeText && (
              <span className={`badge text-[9px] md:text-xs ${badgeType === 'green' ? 'badge-green' : badgeType === 'red' ? 'badge-red' : 'badge-yellow'}`}>
                {badgeText}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[10px] md:text-xs text-gray-400 leading-tight">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={`p-2 md:p-3 rounded-xl flex-shrink-0 hidden sm:flex ${colorMap[color] || colorMap.blue}`}>
            <Icon size={16} className="md:hidden" />
            <Icon size={20} className="hidden md:block" />
          </div>
        )}
      </div>
    </div>
  );
}
