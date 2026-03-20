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
  lime: 'bg-neo-lime/10 border-neo-lime/25 border-t-neo-lime',
  pink: 'bg-neo-pink/10 border-neo-pink/25 border-t-neo-pink',
  orange: 'bg-neo-orange/10 border-neo-orange/25 border-t-neo-orange',
  cyan: 'bg-neo-cyan/10 border-neo-cyan/25 border-t-neo-cyan',
  amber: 'bg-amber-500/10 border-amber-500/25 border-t-amber-500',
  default: 'bg-slate-800/50 border-slate-700/50 border-t-slate-500',
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
          whileHover={prefersReduced ? undefined : { y: -3, scale: 1.04, rotate: 1 }}
          whileTap={prefersReduced ? undefined : { scale: 0.96, rotate: -1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 10 }}
          className={cn(
            'rounded-neo border-3 border-t-4 p-3 text-center cursor-default relative overflow-hidden shadow-hard-sm',
            accentBg[card.accent ?? 'default'],
          )}
        >
          {/* Halftone texture */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-[length:6px_6px]" />
          {/* Top glow */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[radial-gradient(ellipse_at_top,#fff_0%,transparent_50%)]" />
          {card.icon && (
            <motion.div
              className="text-xl mb-1 relative z-10"
              initial={prefersReduced ? undefined : { scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 12, delay: 0.35 }}
            >
              {card.icon}
            </motion.div>
          )}
          <div className="text-2xl font-black text-white tabular-nums relative z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">
            {card.value}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 relative z-10">
            {card.label}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
