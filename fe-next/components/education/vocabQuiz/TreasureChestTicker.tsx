/**
 * Treasure Chest Ticker — projector.
 *
 * Announces the newest steal or swap to the room for a few seconds. Quiet
 * outcomes (gain / double / small loss) stay private to the student.
 *
 * Derived, not queued: the banner is simply "the latest dramatic event, until
 * it has been on screen for TICKER_MS". The earlier queue re-pushed every
 * event on each render and cleared its own hide-timer, so a banner could
 * stick forever.
 */

'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { TreasureChestState, TranslateFn } from '@/shared/types/vocabQuiz';
import { cn } from '@/lib/utils';

export interface TreasureChestTickerProps {
  chestEvents: TreasureChestState[];
  t: TranslateFn;
}

const TICKER_MS = 4000;

const isDramatic = (e: TreasureChestState) => e.outcome === 'steal' || e.outcome === 'swap';

export function TreasureChestTicker({ chestEvents, t }: TreasureChestTickerProps) {
  const reduceMotion = useReducedMotion();
  const latest = [...chestEvents].reverse().find(isDramatic) ?? null;
  const [expired, setExpired] = useState<TreasureChestState | null>(null);

  useEffect(() => {
    if (!latest) return;
    const id = setTimeout(() => setExpired(latest), TICKER_MS);
    return () => clearTimeout(id);
  }, [latest]);

  if (!latest || latest === expired) return null;

  const target = latest.targetUsername || '?';
  const label =
    latest.outcome === 'steal'
      ? t('vocabQuiz.treasure.tickerSteal', { actor: latest.actor, target, amount: latest.amount })
      : t('vocabQuiz.treasure.tickerSwap', { actor: latest.actor, target });

  return (
    <motion.div
      key={`${latest.actor}:${latest.outcome}:${chestEvents.length}`}
      role="status"
      aria-live="polite"
      initial={reduceMotion ? false : { y: 40, scale: 0.9 }}
      animate={{ y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 18 }}
      className={cn(
        // Above the host control bar (fixed to the bottom of the projector).
        'fixed bottom-32 inset-x-4 z-[70] mx-auto w-fit max-w-3xl',
        'rounded-neo border-[3px] bg-neo-navy-elevated px-6 py-3 shadow-hard',
        latest.outcome === 'steal' ? 'border-neo-pink' : 'border-neo-cyan'
      )}
    >
      <p
        className={cn(
          'font-neo-display font-bold text-2xl md:text-4xl text-center',
          latest.outcome === 'steal' ? 'text-neo-pink' : 'text-neo-cyan'
        )}
      >
        {label}
      </p>
    </motion.div>
  );
}

export default TreasureChestTicker;
