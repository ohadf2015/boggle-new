'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import type { CoinRewardTier } from '@/lib/audio/coinSoundPlan';

export interface CoinRewardHudProps {
  /** New coin total after the reward. */
  total: number;
  /** Amount just earned (the +delta). */
  delta: number;
  /** Reward tier — drives the flourish. */
  tier: CoinRewardTier;
  /** 'earn' (default) rolls up with +delta; 'spend' rolls down with -delta. */
  direction?: 'earn' | 'spend';
  /** Screen position to anchor the HUD near (usually the coin counter rect). */
  anchor: { x: number; y: number };
  /** Reduced motion → instant count-up, no sparkle. */
  reduced: boolean;
  /** Cosy/Calm mode → suppress the loud jackpot flair. */
  calm: boolean;
  /** Locale for number formatting (commas). */
  language?: string;
  /** Roll duration in ms (non-reduced only). */
  countDuration?: number;
  /** Called when the moment is over and the HUD should unmount. */
  onDone: () => void;
}

const HOLD_MS = 1100;

/**
 * CoinRewardHud — the transient casino-style counter that replaces the old
 * "+X gold" toast. Rolls the total up from (total-delta) → total, pops a big
 * "+delta", and on a jackpot fires a flourish. Self-contained + anchored, so it
 * works ANYWHERE without a pre-existing persistent counter on screen.
 *
 * Stays visible under reduced motion (instant count-up) so it remains the
 * universal earn confirmation — including for screen readers via the aria-live
 * region — now that the toast is gone.
 */
export function CoinRewardHud({
  total,
  delta,
  tier,
  anchor,
  direction = 'earn',
  reduced,
  calm,
  language = 'en',
  countDuration = 800,
  onDone,
}: CoinRewardHudProps) {
  const isSpend = direction === 'spend';
  // Earn rolls UP from (total-delta); spend rolls DOWN from (total+delta).
  const startValue = isSpend ? total + delta : Math.max(0, total - delta);
  const [display, setDisplay] = useState(reduced ? total : startValue);
  const rafRef = useRef<number | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // No jackpot celebration when money is leaving the wallet.
  const showJackpot = tier === 'jackpot' && !calm && !isSpend;

  // Roll the number toward `total` (rAF ease-out). Reduced motion snaps.
  const roll = useCallback(() => {
    if (reduced || delta <= 0) {
      setDisplay(total);
      return;
    }
    const change = total - startValue; // negative when spending
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / countDuration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(startValue + change * eased));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(total);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [reduced, delta, total, startValue, countDuration]);

  useEffect(() => {
    roll();
    const life = countDuration + HOLD_MS;
    const timer = setTimeout(() => onDoneRef.current(), life);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalText = safeToLocaleString(display, language);
  const deltaText = `${isSpend ? '-' : '+'}${safeToLocaleString(delta, language)}`;

  return (
    <div
      className="pointer-events-none fixed z-[9999]"
      style={{ left: anchor.x, top: anchor.y, transform: 'translate(-50%, -50%)' }}
      data-testid="coin-reward-hud"
    >
      {/* Screen-reader announcement — replaces the retired toast for AT users. */}
      <span role="status" aria-live="polite" className="sr-only">
        {`${deltaText} coins. Balance ${totalText}.`}
      </span>

      <div className="relative flex flex-col items-center" aria-hidden="true">
        {/* Floating +delta */}
        <AnimatePresence>
          <m.div
            key="delta"
            initial={{ opacity: 0, y: isSpend ? -6 : 6, scale: 0.7 }}
            animate={{ opacity: 1, y: isSpend ? 26 : -26, scale: showJackpot ? 1.25 : 1 }}
            exit={{ opacity: 0, y: isSpend ? 44 : -44 }}
            transition={{ duration: reduced ? 0 : 0.6, ease: 'easeOut' }}
            className={cn(
              'absolute -top-6 font-neo-display font-black whitespace-nowrap',
              'drop-shadow-[0_2px_0_black]',
              isSpend
                ? 'text-neo-pink text-lg'
                : showJackpot
                  ? 'text-neo-orange text-2xl'
                  : 'text-neo-lime text-lg',
            )}
            data-testid="coin-hud-delta"
          >
            {deltaText}
          </m.div>
        </AnimatePresence>

        {/* Counter pill */}
        <m.div
          initial={reduced ? false : { scale: 0.85 }}
          animate={{
            scale: reduced ? 1 : showJackpot ? [1, 1.18, 1] : [1, 1.08, 1],
          }}
          transition={{ duration: reduced ? 0 : 0.45, ease: 'easeOut' }}
          className={cn(
            'relative inline-flex items-center gap-2 font-bold rounded-neo-lg overflow-hidden',
            'border-3 border-neo-black shadow-hard px-4 py-2',
            'bg-linear-to-br from-amber-300 via-yellow-400 to-amber-500',
          )}
        >
          {/* Jackpot flair — gold ring burst + label, suppressed under calm. */}
          {showJackpot && (
            <m.div
              className="absolute inset-0 rounded-neo-lg border-2 border-neo-orange pointer-events-none"
              initial={{ scale: 1, opacity: 0.9 }}
              animate={{ scale: 1.9, opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut', repeat: 1 }}
              data-testid="coin-hud-jackpot"
            />
          )}
          <Coins className="w-5 h-5 text-amber-700 drop-shadow-xs relative z-10" strokeWidth={2.5} />
          <span
            className="relative z-10 font-black tracking-tight tabular-nums text-amber-900 drop-shadow-[0_1px_0_rgba(255,255,255,0.5)]"
            data-testid="coin-hud-total"
          >
            {totalText}
          </span>
        </m.div>
      </div>
    </div>
  );
}

export default CoinRewardHud;
