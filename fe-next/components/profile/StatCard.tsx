'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type StatColor = 'cyan' | 'pink' | 'lime' | 'purple';

const colorMap: Record<StatColor, { text: string; iconBg: string; iconText: string; bar: string }> = {
  cyan: {
    text: 'text-neo-cyan',
    iconBg: 'bg-neo-cyan/10',
    iconText: 'text-neo-cyan',
    bar: 'bg-neo-cyan',
  },
  pink: {
    text: 'text-neo-pink',
    iconBg: 'bg-neo-pink/10',
    iconText: 'text-neo-pink',
    bar: 'bg-neo-pink',
  },
  lime: {
    text: 'text-neo-lime',
    iconBg: 'bg-neo-lime/10',
    iconText: 'text-neo-lime',
    bar: 'bg-neo-lime',
  },
  purple: {
    text: 'text-neo-purple',
    iconBg: 'bg-neo-purple/10',
    iconText: 'text-neo-purple',
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
    <div className="bg-slate-800/40 backdrop-blur-sm p-5 rounded-[20px] border border-white/[0.08]">
      {/* Icon box */}
      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3',
        c ? `${c.iconBg} ${c.iconText}` : 'bg-slate-700/50 text-gray-400'
      )}>
        {icon}
      </div>

      {/* Label */}
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">
        {label}
      </p>

      {/* Value */}
      <p className={cn(
        'text-2xl font-black',
        c ? c.text : 'text-white'
      )}>
        {value}
      </p>

      {/* Decorative progress bar */}
      {progress !== undefined && (
        <div className="mt-3 h-1 bg-white/[0.06] rounded-full overflow-hidden">
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
