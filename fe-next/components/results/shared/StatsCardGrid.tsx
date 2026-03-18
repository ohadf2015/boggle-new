'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
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
  lime: 'bg-neo-lime/15 border-neo-lime/30',
  pink: 'bg-neo-pink/15 border-neo-pink/30',
  orange: 'bg-neo-orange/15 border-neo-orange/30',
  cyan: 'bg-neo-cyan/15 border-neo-cyan/30',
  amber: 'bg-amber-500/15 border-amber-500/30',
  default: 'bg-slate-800/50 border-slate-700/50',
};

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

const cardVariant = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 22 },
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
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        data-testid="stats-grid"
        className={cn(
          'bg-slate-800/50 rounded-xl border border-slate-700/50 p-3',
          className,
        )}
      >
        <div className="flex items-center justify-around">
          {cards.map((card, i) => (
            <React.Fragment key={card.label}>
              {i > 0 && (
                <div
                  data-testid="stat-divider"
                  className="w-px h-8 bg-slate-700"
                />
              )}
              <motion.div
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
                <div className="text-xs text-slate-400 font-medium">
                  {card.label}
                </div>
              </motion.div>
            </React.Fragment>
          ))}
        </div>
      </motion.div>
    );
  }

  // Grid variant — neo-brutalist cards
  return (
    <motion.div
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
        <motion.div
          key={card.label}
          variants={prefersReduced ? cardReduced : cardVariant}
          whileHover={prefersReduced ? undefined : { y: -2, scale: 1.03 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className={cn(
            'rounded-neo border-2 p-3 text-center cursor-default',
            accentBg[card.accent ?? 'default'],
          )}
        >
          {card.icon && (
            <motion.div
              className="text-lg mb-0.5"
              initial={prefersReduced ? undefined : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.3 }}
            >
              {card.icon}
            </motion.div>
          )}
          <div className="text-xl font-black text-white tabular-nums">
            {card.value}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {card.label}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
