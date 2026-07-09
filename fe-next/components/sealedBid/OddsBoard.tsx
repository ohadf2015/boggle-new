'use client';

import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { useLanguage } from '@/contexts/LanguageContext';
import { oddsMultiplier } from '@/lib/sealedBid/sp/wager';
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
    return (
      <div
        data-testid="odds-board"
        className="mx-auto flex max-w-sm flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-neo border-2 border-black bg-neo-navy/90 px-3 py-2 shadow-hard-sm"
      >
        <div
          data-testid="odds-mult"
          className="font-neo-display text-base font-black text-neo-yellow sm:text-lg"
        >
          {multText}
        </div>
        <div
          data-testid="odds-payout"
          className="font-neo-body text-sm font-bold text-neo-cyan tabular-nums"
        >
          {payoutText}
        </div>
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
        className="text-center font-neo-display text-3xl font-bold leading-tight text-neo-yellow sm:text-5xl"
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
