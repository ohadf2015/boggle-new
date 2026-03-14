'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type StatColor = 'cyan' | 'pink' | 'lime' | 'purple';

const colorMap: Record<StatColor, { border: string; shadow: string; text: string; iconBg: string; bar: string }> = {
  cyan: {
    border: 'border-neo-cyan',
    shadow: 'shadow-hard-cyan',
    text: 'text-neo-cyan',
    iconBg: 'bg-neo-cyan',
    bar: 'bg-neo-cyan',
  },
  pink: {
    border: 'border-neo-pink',
    shadow: 'shadow-hard-pink',
    text: 'text-neo-pink',
    iconBg: 'bg-neo-pink',
    bar: 'bg-neo-pink',
  },
  lime: {
    border: 'border-neo-lime',
    shadow: 'shadow-hard-lime',
    text: 'text-neo-lime',
    iconBg: 'bg-neo-lime',
    bar: 'bg-neo-lime',
  },
  purple: {
    border: 'border-neo-purple',
    shadow: 'shadow-hard-purple',
    text: 'text-neo-purple',
    iconBg: 'bg-neo-purple',
    bar: 'bg-neo-purple',
  },
};

export interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  isDarkMode: boolean;
  highlight?: boolean;
  color?: StatColor;
  /** Decorative progress 0-100 */
  progress?: number;
}

export function StatCard({ icon, label, value, isDarkMode, highlight = false, color, progress }: StatCardProps): React.ReactNode {
  const c = color ? colorMap[color] : null;

  return (
    <div className={cn(
      'bg-slate-800/80 p-6 rounded-2xl border-3',
      c ? `${c.border} ${c.shadow}` : 'border-slate-700'
    )}>
      {/* Icon box */}
      <div className={cn(
        'w-12 h-12 rounded-lg flex items-center justify-center text-xl mb-3',
        c ? `${c.iconBg} text-neo-black` : 'bg-slate-700 text-gray-400'
      )}>
        {icon}
      </div>

      {/* Label */}
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
        {label}
      </p>

      {/* Value */}
      <p className={cn(
        'text-3xl font-black',
        c ? c.text : 'text-white'
      )}>
        {value}
      </p>

      {/* Decorative progress bar */}
      {progress !== undefined && (
        <div className="mt-3 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', c ? c.bar : 'bg-neo-cyan')}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default StatCard;
