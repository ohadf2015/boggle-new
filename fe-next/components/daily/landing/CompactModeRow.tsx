'use client';

import { m } from 'framer-motion';
import { Play, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export interface CompactModeRowProps {
  icon: ReactNode;
  title: string;
  color: 'orange' | 'yellow' | 'cyan' | 'purple';
  onPlay: () => void;
  played?: boolean;
  delay?: number;
}

const COLOR_ACCENTS: Record<string, string> = {
  orange: 'text-neo-orange',
  yellow: 'text-neo-yellow',
  cyan: 'text-neo-cyan',
  purple: 'text-neo-purple',
};

/**
 * CompactModeRow — secondary quest card for the daily hub.
 * One line: icon + title + small Play button. No illustrated background.
 * Used for non-primary modes when pickPrimaryMode selects a hero.
 * When played: background full opacity, check mark badge, "Done" label instead of Play.
 */
export function CompactModeRow({
  icon,
  title,
  color,
  onPlay,
  played = false,
  delay = 0,
}: CompactModeRowProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 25 }}
      className="w-full"
      data-testid={`compact-row-${color}`}
    >
      <button
        type="button"
        onClick={onPlay}
        disabled={played}
        className={cn(
          'relative w-full px-4 py-3 rounded-lg border-2 border-neo-black',
          'shadow-hard-xs overflow-hidden cursor-pointer',
          'flex items-center gap-3',
          'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime',
          'transition-all duration-200 group',
          played
            ? 'bg-neo-navy hover:bg-neo-navy cursor-default opacity-75'
            : 'bg-neo-navy/60 hover:bg-neo-navy/80'
        )}
      >
        {/* Icon */}
        <div className={cn(
          'shrink-0 w-6 h-6 flex items-center justify-center',
          COLOR_ACCENTS[color]
        )}>
          {icon}
        </div>

        {/* Title */}
        <h3 className="text-sm font-neo-display font-black text-neo-white flex-1 text-start">
          {title}
        </h3>

        {/* Status Badge / Play Button */}
        {played ? (
          <m.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className={cn(
              'shrink-0 py-1.5 px-3 text-xs font-black uppercase rounded-md text-center',
              'bg-neo-lime text-neo-black border border-neo-black shadow-hard-xs',
              'flex items-center gap-1'
            )}
            data-testid={`${color}-done-badge`}
          >
            <CheckCircle2 className="w-3 h-3" />
          </m.div>
        ) : (
          <div className={cn(
            'shrink-0 py-1.5 px-3 text-xs font-black uppercase rounded-md text-center',
            'bg-neo-lime text-neo-black border border-neo-black shadow-hard-xs',
            'active:translate-y-0.5 active:shadow-none transition-all',
            'flex items-center gap-1 group-hover:scale-110'
          )}>
            <Play className="w-3 h-3" />
          </div>
        )}
      </button>
    </m.div>
  );
}
