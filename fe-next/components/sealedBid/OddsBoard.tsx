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

  // GSAP odometer ref for the multiplier
  const multDisplayRef = useRef<HTMLDivElement>(null);
  const multValueRef = useRef({ value: mult });

  // Animate multiplier change with GSAP (unless reduced motion)
  useEffect(() => {
    if (shouldReduceMotion || !hasValidWord) {
      multValueRef.current.value = mult;
      if (multDisplayRef.current) {
        multDisplayRef.current.textContent = hasValidWord ? mult.toFixed(1) : '—';
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
      multDisplayRef.current.textContent = hasValidWord ? mult.toFixed(1) : '—';
    }
  }, [mult, hasValidWord, shouldReduceMotion]);

  return (
    <div className="border-neo-thick border-black shadow-hard-lg bg-neo-navy-light rounded-neo p-6">
      {/* Multiplier */}
      <div className="mb-4">
        <div
          data-testid="odds-mult"
          className="font-neo-display text-5xl text-neo-yellow"
        >
          <span ref={multDisplayRef}>{hasValidWord ? mult.toFixed(1) : '—'}</span>
        </div>
        <div className="text-sm text-neo-cream mt-1">
          {t('sealedBid.uniquePays', { mult: hasValidWord ? mult.toFixed(1) : '—' })}
        </div>
      </div>

      {/* Payout */}
      <div>
        <div
          data-testid="odds-payout"
          className="font-neo-body text-neo-cyan text-2xl"
        >
          {payout}
        </div>
        <div className="text-sm text-neo-cream mt-1">
          {t('sealedBid.potentialPayout', { amount: payout })}
        </div>
      </div>
    </div>
  );
}
