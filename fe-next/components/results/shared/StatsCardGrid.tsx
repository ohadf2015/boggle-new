'use client';

import React from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface StatCardItem {
  /** Display label (translated) */
  label: string;
  /** Value to show — number or formatted string */
  value: string | number;
  /** Icon: emoji string or React node (e.g. Lucide icon) */
  icon?: React.ReactNode;
  /** Accent color for the card */
  accent?: 'lime' | 'pink' | 'orange' | 'cyan' | 'amber' | 'default';
}

interface StatsCardGridProps {
  cards: StatCardItem[];
  /** 'grid' = neo-brutalist cards, 'inline' = Daily Challenge-style row with dividers */
  variant?: 'grid' | 'inline';
  className?: string;
}

const accentBg: Record<string, string> = {
  lime: 'bg-neo-lime/8 border-neo-lime/30',
  pink: 'bg-neo-pink/8 border-neo-pink/30',
  orange: 'bg-neo-orange/8 border-neo-orange/30',
  cyan: 'bg-neo-cyan/8 border-neo-cyan/30',
  amber: 'bg-amber-500/8 border-amber-500/30',
  default: 'bg-neo-navy-light/40 border-slate-700/40',
};

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

const cardVariant = {
  hidden: { opacity: 0, y: 24, scale: 0.88, rotate: -2 },
  show: {
    opacity: 1, y: 0, scale: 1, rotate: 0,
    transition: { type: 'spring' as const, stiffness: 340, damping: 14 },
  },
};

const cardReduced = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.15 } },
};

/**
 * StatsCardGrid — Unified stats display for all results pages.
 *
 * Two variants:
 * - 'grid': Neo-brutalist cards in a responsive grid (SP, MP)
 * - 'inline': Single row with dividers (Daily Challenge style)
 */
export function StatsCardGrid({ cards, variant = 'grid', className }: StatsCardGridProps) {
  const prefersReduced = useReducedMotion();

  if (variant === 'inline') {
    return (
      <m.div
        variants={container}
        initial="hidden"
        animate="show"
        data-testid="stats-grid"
        className={cn(
          'bg-neo-navy/60 rounded-neo border-2 border-slate-700/40 p-3',
          className,
        )}
      >
        <div className="flex items-center justify-around">
          {cards.map((card, i) => (
            <React.Fragment key={card.label}>
              {i > 0 && (
                <div
                  data-testid="stat-divider"
                  className="w-px h-8 bg-neo-navy-elevated"
                />
              )}
              <m.div
                variants={prefersReduced ? cardReduced : cardVariant}
                className="text-center px-3"
              >
                <div className="flex items-center justify-center gap-1">
                  {card.icon && (
                    <span className="text-sm">{card.icon}</span>
                  )}
                  <span className="text-2xl font-black text-white">
                    {card.value}
                  </span>
                </div>
                <div className="text-xs text-neo-white font-bold">
                  {card.label}
                </div>
              </m.div>
            </React.Fragment>
          ))}
        </div>
      </m.div>
    );
  }

  // Grid variant — clean neo-brutalist cards
  return (
    <m.div
      variants={container}
      initial="hidden"
      animate="show"
      data-testid="stats-grid"
      className={cn(
        'grid gap-2',
        cards.length <= 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4',
        className,
      )}
    >
      {cards.map((card) => (
        <m.div
          key={card.label}
          variants={prefersReduced ? cardReduced : cardVariant}
          className={cn(
            'rounded-neo border-2 p-2.5 text-center',
            accentBg[card.accent ?? 'default'],
          )}
        >
          {card.icon && (
            <div className="text-lg mb-0.5">{card.icon}</div>
          )}
          <div className="text-xl font-black text-white tabular-nums">
            {card.value}
          </div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
            {card.label}
          </div>
        </m.div>
      ))}
    </m.div>
  );
}
