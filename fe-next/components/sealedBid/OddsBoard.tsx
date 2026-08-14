'use client';

import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { useLanguage } from '@/contexts/LanguageContext';
import { oddsMultiplier, isHotOdds } from '@/lib/sealedBid/sp/wager';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export interface OddsBoardProps {
  word: string;
  stake: number;
  reducedMotion?: boolean;
  /** Slim casino odds strip (table rim). */
  compact?: boolean;
}

export default function OddsBoard({
  word,
  stake,
  reducedMotion: forceReducedMotion,
  compact = false,
}: OddsBoardProps) {
  const { t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = forceReducedMotion ?? prefersReducedMotion;

  const displayedMultRef = useRef<number>(1.5);
  const [displayedMult, setDisplayedMult] = useState<number>(1.5);

  const shouldShow = Boolean(word && word.length >= 3);
  const mult = shouldShow ? oddsMultiplier(word) : 1.5;
  const payout = shouldShow ? Math.round(stake * mult) : 0;
  const hot = shouldShow && isHotOdds(mult);

  useEffect(() => {
    if (!shouldShow) return;
    if (reducedMotion) {
      displayedMultRef.current = mult;
      setDisplayedMult(mult);
      return;
    }

    gsap.to(displayedMultRef, {
      current: mult,
      duration: 0.5,
      ease: 'power2.out',
      onUpdate: () => {
        setDisplayedMult(Math.round(displayedMultRef.current * 10) / 10);
      },
    });
  }, [mult, reducedMotion, shouldShow]);

  if (!shouldShow && compact) {
    return null;
  }

  const multDisplay = shouldShow ? displayedMult.toFixed(1) : '—';
  const payoutText = shouldShow
    ? t('sealedBid.potentialPayout', { amount: payout })
    : '—';
  const multText = t('sealedBid.uniquePays', { mult: multDisplay });

  if (compact) {
    // Rim strip: ONE line, no wrap, no chrome of its own — the table nests this
    // inside the shared stake strip. The prose forms ("Unique pays 4.0x",
    // "Potential payout 80") wrapped to two lines at phone widths and cost the
    // wheel ~75px of height, which is what pushed the tiles onto their
    // neighbours. Glyphs here, full sentence on the aria-label.
    return (
      <div
        data-testid="odds-board"
        className="flex min-w-0 items-center gap-2 whitespace-nowrap"
      >
        <span
          data-testid="odds-mult"
          aria-label={multText}
          dir="ltr"
          className={`font-neo-display text-base font-black tabular-nums sm:text-lg ${
            hot ? 'text-neo-orange' : 'text-neo-yellow'
          } ${hot && !reducedMotion ? 'animate-neo-pop' : ''}`}
        >
          ×{multDisplay}
        </span>
        <span
          data-testid="odds-payout"
          aria-label={payoutText}
          dir="ltr"
          className="font-neo-body text-sm font-black text-neo-cyan tabular-nums"
        >
          {/* No dash branch: the compact strip early-returns null when there is
              no word yet, so shouldShow is always true by here. */}
          →{payout}
        </span>
      </div>
    );
  }

  return (
    <div
      data-testid="odds-board"
      className="flex flex-col items-center gap-2 rounded-neo border-neo-thick border-black bg-neo-navy-light p-4 shadow-hard-lg sm:p-6 sm:gap-3"
    >
      <div
        data-testid="odds-mult"
        className={`text-center font-neo-display text-3xl font-bold leading-tight sm:text-5xl ${
          hot ? 'text-neo-orange' : 'text-neo-yellow'
        } ${hot && !reducedMotion ? 'animate-neo-pop' : ''}`}
      >
        {multText}
      </div>
      <div
        data-testid="odds-payout"
        className="text-center font-neo-body text-base text-neo-cyan sm:text-lg"
      >
        {payoutText}
      </div>
    </div>
  );
}
