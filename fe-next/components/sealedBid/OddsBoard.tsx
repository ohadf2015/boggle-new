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
}

export default function OddsBoard({ word, stake, reducedMotion: forceReducedMotion }: OddsBoardProps) {
  const { t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = forceReducedMotion ?? prefersReducedMotion;

  const displayedMultRef = useRef<number>(1.5);
  const [displayedMult, setDisplayedMult] = useState<number>(1.5);

  // Compute multiplier and potential payout
  const shouldShow = word && word.length >= 3;
  const mult = shouldShow ? oddsMultiplier(word) : 1.5;
  const payout = shouldShow ? Math.round(stake * mult) : 0;

  // GSAP odometer animation
  useEffect(() => {
    if (reducedMotion) {
      displayedMultRef.current = mult;
      setDisplayedMult(mult);
      return;
    }

    gsap.to(displayedMultRef, {
      current: mult,
      duration: 0.6,
      ease: 'power2.out',
      onUpdate: () => {
        setDisplayedMult(Math.round(displayedMultRef.current * 10) / 10);
      },
    });
  }, [mult, reducedMotion]);

  const multDisplay = shouldShow ? displayedMult.toFixed(1) : '—';
  const payoutText = shouldShow ? t('sealedBid.potentialPayout', { amount: payout }) : '—';
  const multText = t('sealedBid.uniquePays', { mult: multDisplay });

  return (
    <div className="flex flex-col items-center gap-3 rounded-neo border-neo-thick border-black bg-neo-navy-light p-6 shadow-hard-lg">
      {/* Multiplier display */}
      <div
        data-testid="odds-mult"
        className="text-center font-neo-display text-5xl font-bold text-neo-yellow leading-tight"
      >
        {multText}
      </div>

      {/* Payout display */}
      <div
        data-testid="odds-payout"
        className="text-center font-neo-body text-lg text-neo-cyan"
      >
        {payoutText}
      </div>
    </div>
  );
}
