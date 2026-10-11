'use client';

import React from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { Sparkles, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WheelCelebration {
  tier: 'all' | 'almost';
  word: string;
  /** Bump on each fire so a new pangram replaces (re-animates) the previous banner. */
  key: number;
  /** Consecutive 'all' clears this round (2+ triggers the streak badge). */
  streak?: number;
  /** Points the word scored, shown on the banner when it replaces the praise pill. */
  points?: number;
}

interface Props {
  celebration: WheelCelebration | null;
  t: (path: string, params?: Record<string, string | number>) => string;
  prefersReduced: boolean;
  /** Seconds to hold the entrance so the scored word can fly clear first. */
  delay?: number;
  /** Replaces the default placement (a third of the way down the parent). */
  className?: string;
}

/**
 * Transient "you used the whole wheel" banner — the MP analogue of the daily
 * challenge pangram celebration. Purely presentational; the parent owns the
 * timer that clears `celebration` back to null. Pointer-events disabled so it
 * never blocks the wheel underneath.
 */
export const WheelRushCelebration: React.FC<Props> = ({ celebration, t, prefersReduced, delay = 0, className }) => (
  <div className={cn('pointer-events-none absolute z-50 flex justify-center', className ?? 'inset-x-0 top-1/3')}>
    <AnimatePresence mode="wait">
      {celebration && (
        <m.div
          key={celebration.key}
          data-testid="wheel-celebration"
          data-tier={celebration.tier}
          className={cn(
            'flex flex-col items-center gap-1 px-5 py-3 rounded-neo border-3 border-neo-black shadow-hard-lg',
            celebration.tier === 'all'
              ? 'bg-neo-yellow text-neo-black'
              : 'bg-neo-lime text-neo-black',
          )}
          initial={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: 12 }}
          animate={prefersReduced ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
          exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: -12 }}
          transition={prefersReduced ? { duration: 0.15 } : { type: 'spring', stiffness: 380, damping: 18, delay }}
        >
          <span className="flex items-center gap-1.5 font-neo-display font-black text-lg sm:text-xl tracking-wide">
            <Sparkles className="w-5 h-5" />
            {celebration.tier === 'all'
              ? t('wordWheel.allLettersUsed')
              : t('wordWheel.almostAllLetters')}
            <Sparkles className="w-5 h-5" />
          </span>
          <span className="flex items-center gap-2">
            <span dir="auto" className="font-neo-body font-bold text-sm uppercase tracking-widest opacity-80">
              {celebration.word}
            </span>
            {celebration.points !== undefined && (
              <span className="px-2 py-0.5 rounded-full border-2 border-neo-black bg-neo-black text-neo-lime font-neo-display font-black text-sm tabular-nums">
                +{celebration.points}
              </span>
            )}
          </span>
          {celebration.tier === 'all' && (celebration.streak ?? 0) >= 4 ? (
            <span className="flex items-center gap-1 font-neo-display font-black text-xs uppercase tracking-wide bg-neo-orange text-neo-black px-2 py-0.5 rounded-neo">
              <Flame className="w-3 h-3" />
              {t('wordWheel.onFireBadge', { count: celebration.streak as number })}
            </span>
          ) : (
            celebration.tier === 'all' && (celebration.streak ?? 0) >= 2 && (
              <span className="font-neo-display font-black text-xs uppercase tracking-wide bg-neo-black text-neo-yellow px-2 py-0.5 rounded-neo">
                {t('wordWheel.streakBadge', { count: celebration.streak as number })}
              </span>
            )
          )}
        </m.div>
      )}
    </AnimatePresence>
  </div>
);

export default WheelRushCelebration;
