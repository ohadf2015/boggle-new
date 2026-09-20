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
  /** Mode artwork (the same mascot the hero card uses). Omitted → no art slot. */
  artUrl?: string;
}

/* Every class is spelled out in full: Tailwind only emits a class when the
   literal string appears in source, so `bg-neo-${color}` would silently produce
   nothing. Same rule the hero QuestCard documents. */
const COLOR_CONFIGS = {
  orange: {
    icon: 'text-neo-orange',
    edge: 'bg-neo-orange',
    tint: 'bg-neo-orange/10',
    ring: 'focus-visible:ring-neo-orange',
  },
  yellow: {
    icon: 'text-neo-yellow',
    edge: 'bg-neo-yellow',
    tint: 'bg-neo-yellow/10',
    ring: 'focus-visible:ring-neo-yellow',
  },
  cyan: {
    icon: 'text-neo-cyan',
    edge: 'bg-neo-cyan',
    tint: 'bg-neo-cyan/10',
    ring: 'focus-visible:ring-neo-cyan',
  },
  purple: {
    icon: 'text-neo-purple',
    edge: 'bg-neo-purple',
    tint: 'bg-neo-purple/10',
    ring: 'focus-visible:ring-neo-purple',
  },
} as const;

/**
 * CompactModeRow — secondary quest card for the daily hub.
 *
 * One line: accent edge + mode art + icon + title + small Play button.
 * The rows used to differ only by a 24px icon tint, which made Word Wheel,
 * Word Tower and Connections read as three copies of the same row. Each row now
 * carries its mode's artwork, a solid accent edge and an accent-coloured focus
 * ring, so the hub is scannable without reading the titles.
 *
 * When played: check-mark badge, dimmed, not clickable.
 */
export function CompactModeRow({
  icon,
  title,
  color,
  onPlay,
  played = false,
  delay = 0,
  artUrl,
}: CompactModeRowProps) {
  const config = COLOR_CONFIGS[color] ?? COLOR_CONFIGS.cyan;

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
          'relative w-full ps-5 pe-4 py-3 rounded-lg border-2 border-neo-black',
          'shadow-hard-xs overflow-hidden cursor-pointer',
          'flex items-center gap-3',
          'focus-visible:outline-hidden focus-visible:ring-4',
          config.ring,
          'transition-all duration-200 group',
          played
            ? 'bg-neo-navy hover:bg-neo-navy cursor-default opacity-75'
            : 'bg-neo-navy/60 hover:bg-neo-navy/80'
        )}
      >
        {/* Accent edge — start-anchored so it flips to the right in Hebrew. */}
        <span
          aria-hidden="true"
          data-testid={`mode-row-edge-${color}`}
          className={cn('absolute start-0 top-0 bottom-0 w-1.5', config.edge)}
        />

        {/* Accent wash: carries the mode's hue across the whole row. */}
        <span
          aria-hidden="true"
          className={cn('absolute inset-0 pointer-events-none', config.tint)}
        />

        {/* Mode art — the strongest "which game is this" signal.
            A CSS background rather than <img>: it is purely decorative (the
            title beside it names the mode), it is the convention the hero
            QuestCard already uses for the same mascots, and it keeps the row
            free of next/image machinery for a 36px thumbnail. */}
        {artUrl && (
          <span
            aria-hidden="true"
            role="presentation"
            data-testid={`mode-row-art-${color}`}
            data-art-url={artUrl}
            style={{ backgroundImage: `url(${artUrl})` }}
            className={cn(
              'relative shrink-0 w-9 h-9 rounded-md bg-cover bg-center',
              'border-2 border-neo-black/60',
              played && 'grayscale'
            )}
          />
        )}

        {/* Icon */}
        <div className={cn('relative shrink-0 w-6 h-6 flex items-center justify-center', config.icon)}>
          {icon}
        </div>

        {/* Title */}
        <h3 className="relative text-sm font-neo-display font-black text-neo-white flex-1 text-start">
          {title}
        </h3>

        {/* Status Badge / Play Button */}
        {played ? (
          <m.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className={cn(
              'relative shrink-0 py-1.5 px-3 text-xs font-black uppercase rounded-md text-center',
              'bg-neo-lime text-neo-black border border-neo-black shadow-hard-xs',
              'flex items-center gap-1'
            )}
            data-testid={`${color}-done-badge`}
          >
            <CheckCircle2 className="w-3 h-3" />
          </m.div>
        ) : (
          <div className={cn(
            'relative shrink-0 py-1.5 px-3 text-xs font-black uppercase rounded-md text-center',
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
