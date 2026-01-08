'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  isDarkMode: boolean;
  highlight?: boolean;
}

export function StatCard({ icon, label, value, isDarkMode, highlight = false }: StatCardProps): React.ReactNode {
  return (
    <div className={cn(
      'rounded-xl p-4 text-center',
      highlight
        ? isDarkMode
          ? 'bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border border-cyan-500/30'
          : 'bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200'
        : isDarkMode
          ? 'bg-slate-800/50 border border-slate-700'
          : 'bg-white border border-gray-200 shadow-md'
    )}>
      <div className={cn(
        'text-2xl mb-2',
        highlight
          ? isDarkMode ? 'text-cyan-400' : 'text-cyan-600'
          : isDarkMode ? 'text-gray-400' : 'text-gray-600'
      )}>
        {icon}
      </div>
      <p className={cn(
        'text-2xl font-bold',
        highlight
          ? isDarkMode ? 'text-cyan-400' : 'text-cyan-600'
          : isDarkMode ? 'text-white' : 'text-gray-900'
      )}>
        {value}
      </p>
      <p className={cn(
        'text-xs',
        isDarkMode ? 'text-gray-400' : 'text-gray-600'
      )}>
        {label}
      </p>
    </div>
  );
}

export default StatCard;
