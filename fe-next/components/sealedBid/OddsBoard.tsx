'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { oddsMultiplier } from '../../lib/sealedBid/sp/wager';
import { useLanguage } from '../../contexts/LanguageContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export interface OddsBoardProps {
  word: string;
  stake: number;
  reducedMotion?: boolean;
}

export default function OddsBoard({ word, stake, reducedMotion }: OddsBoardProps) {
  const { t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = reducedMotion || prefersReducedMotion;

  // Compute multiplier and payout
  const hasValidWord = word.length >= 3;
  const mult = hasValidWord ? oddsMultiplier(word.toUpperCase()) : 0;
  const payout = hasValidWord ? Math.round(stake * mult) : 0;
  const multText = hasValidWord ? mult.toFixed(1) : '—';

  // GSAP odometer ref for the multiplier
  const multDisplayRef = useRef<HTMLDivElement>(null);
  const multValueRef = useRef({ value: mult });

  // Animate multiplier change with GSAP (unless reduced motion)
  useEffect(() => {
    if (shouldReduceMotion || !hasValidWord) {
      multValueRef.current.value = mult;
      if (multDisplayRef.current) {
        multDisplayRef.current.textContent = multText;
      }
      return;
    }

    const oldValue = multValueRef.current.value;
    multValueRef.current.value = mult;

    // Only animate if the value actually changed
    if (oldValue !== mult && hasValidWord) {
      gsap.to(multValueRef.current, {
        value: mult,
        duration: 0.5,
        onUpdate: () => {
          if (multDisplayRef.current) {
            multDisplayRef.current.textContent = multValueRef.current.value.toFixed(1);
          }
        },
      });
    } else if (multDisplayRef.current) {
      multDisplayRef.current.textContent = multText;
    }
  }, [mult, hasValidWord, shouldReduceMotion, multText]);

  return (
    <div className="border-neo-thick border-black shadow-hard-lg bg-neo-navy-light rounded-neo p-3 flex items-center justify-between gap-4">
      {/* Multiplier */}
      <div>
        <div
          data-testid="odds-mult"
          className="font-neo-display text-3xl text-neo-yellow leading-none"
        >
          <span ref={multDisplayRef}>{multText}</span>
          <span className="text-base">×</span>
        </div>
        <div className="text-xs text-neo-cream mt-0.5">
          {t('sealedBid.uniquePays', { mult: multText })}
        </div>
      </div>

      {/* Payout */}
      <div className="text-right">
        <div
          data-testid="odds-payout"
          className="font-neo-body text-neo-cyan text-xl leading-none"
        >
          {payout}
        </div>
        <div className="text-xs text-neo-cream mt-0.5">
          {t('sealedBid.potentialPayout', { amount: payout })}
        </div>
      </div>
    </div>
  );
}
