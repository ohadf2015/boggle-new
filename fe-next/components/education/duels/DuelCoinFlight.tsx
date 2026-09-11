'use client';

/**
 * DuelCoinFlight — coins you can actually see arrive.
 *
 * Duels already awarded coins on completion, but silently: `awardGameCoins` ran
 * and nothing on screen moved. This flies a handful of coin tokens into a coin
 * counter and ticks the counter up as they land, with a coin chime per landing
 * and a cascade on the last one.
 *
 * The number is not invented here — it is the same amount the caller passes to
 * the coin ledger, so the animation can never claim a different total.
 *
 * Reduced motion / low-end devices: the counter jumps straight to the total and
 * `onComplete` fires immediately. No flying tokens, no timers.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { m } from 'framer-motion';
import { Coins } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useSkipAnimations } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';

/** Most tokens we ever fly, however big the award. */
const MAX_TOKENS = 8;
/** Delay between two coins landing. */
const LANDING_INTERVAL_MS = 160;
/** How long a token takes to reach the counter. */
const FLIGHT_MS = 520;

export interface DuelCoinFlightProps {
  /** Coins awarded for this duel. */
  coins: number;
  /** Start the flight (the reveal screen turns this on once it is mounted). */
  active: boolean;
  onComplete?: () => void;
  className?: string;
}

export function DuelCoinFlight({ coins, active, onComplete, className }: DuelCoinFlightProps) {
  const { t } = useLanguage();
  const { playSound } = useSoundEffects();
  const skipAnimations = useSkipAnimations();

  const [awarded, setAwarded] = useState(0);
  const [flying, setFlying] = useState(false);
  const completedRef = useRef(false);

  const tokenCount = useMemo(() => {
    if (coins <= 0) return 0;
    return Math.min(coins, MAX_TOKENS);
  }, [coins]);

  useEffect(() => {
    if (!active) return;
    if (completedRef.current) return;

    // Nothing to award, or the viewer asked for calm: land it instantly.
    if (coins <= 0 || skipAnimations) {
      completedRef.current = true;
      setAwarded(Math.max(coins, 0));
      onComplete?.();
      return;
    }

    setFlying(true);
    const perToken = Math.floor(coins / tokenCount);
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (let i = 0; i < tokenCount; i++) {
      const isLast = i === tokenCount - 1;
      timers.push(
        setTimeout(
          () => {
            setAwarded((current) => (isLast ? coins : Math.min(current + perToken, coins)));
            playSound('coinCollect', { volume: 0.35, rate: 1 + i * 0.04, requiresGameActive: false });
            if (isLast) {
              playSound('coinCascade', { volume: 0.5, requiresGameActive: false });
              setFlying(false);
              completedRef.current = true;
              onComplete?.();
            }
          },
          FLIGHT_MS + i * LANDING_INTERVAL_MS
        )
      );
    }

    return () => timers.forEach(clearTimeout);
    // onComplete/playSound are stable callbacks from their providers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, coins, skipAnimations, tokenCount]);

  return (
    <div className={cn('relative inline-flex items-center', className)}>
      {/* The counter the coins land in */}
      <div
        data-testid="duel-coin-counter"
        aria-live="polite"
        aria-label={t('education.duels.coinsEarned', undefined, { count: awarded })}
        className={cn(
          'relative z-10 inline-flex items-center gap-1.5 rounded-neo border-neo bg-neo-yellow px-3 py-1.5 shadow-hard',
          'font-neo-display text-lg font-black tabular-nums text-neo-black'
        )}
      >
        <Coins className="h-5 w-5" aria-hidden="true" />
        {awarded}
      </div>

      {/* Coins in flight — they converge on the counter above */}
      {flying &&
        Array.from({ length: tokenCount }).map((_, index) => (
          <m.div
            key={`coin-${index}`}
            data-testid="duel-coin-token"
            aria-hidden="true"
            className="pointer-events-none absolute start-1/2 top-1/2 h-5 w-5 rounded-full border-2 border-neo-black bg-neo-yellow shadow-hard-sm"
            initial={{ x: (index - tokenCount / 2) * 26, y: 96, scale: 0.7 }}
            animate={{ x: 0, y: 0, scale: 1 }}
            transition={{
              duration: FLIGHT_MS / 1000,
              delay: (index * LANDING_INTERVAL_MS) / 1000,
              ease: 'easeIn',
            }}
          />
        ))}
    </div>
  );
}
