'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface HighlightsBarProps {
  stats: Array<{
    label: string;
    value: string | number;
    icon: ReactNode;
    color: string; // Tailwind text color class like 'text-neo-pink'
  }>;
}

export default function HighlightsBar({ stats }: HighlightsBarProps) {
  if (!stats.length) return null;

  return (
    <section
      className={cn(
        'flex justify-around items-center py-4 rounded-neo',
        'bg-neo-navy-light/40 border-y border-white/5',
        stats.length > 3 && 'overflow-x-auto'
      )}
    >
      {stats.map((stat, index) => (
        <div key={stat.label} className="contents">
          {index > 0 && <div className="w-px h-8 bg-white/5 shrink-0" />}
          <div className="text-center px-2 shrink-0">
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1">
              {stat.label}
            </p>
            <div className="flex items-center justify-center gap-1.5">
              <span className={cn('text-xs', stat.color)}>{stat.icon}</span>
              <span
                className={cn(
                  'text-sm font-black uppercase tracking-tight',
                  stat.color
                )}
              >
                {stat.value}
              </span>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
