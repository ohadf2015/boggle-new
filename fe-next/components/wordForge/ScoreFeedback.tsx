'use client';

import React, { useEffect, useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import type { WordScoreResult } from '@/types/wordForge';
import { cn } from '@/lib/utils';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';

interface ScoreFeedbackProps {
  lastScore: WordScoreResult | null;
}

/**
 * ScoreFeedback — Ephemeral display of the last word's score breakdown.
 * Shows: "BRAVE → 10 × 2.0 × 1.5 = 30"
 * Color-coded: cyan for base, red for mult, gold for total.
 * Fades after 2.5 seconds.
 */
export function ScoreFeedback({ lastScore }: ScoreFeedbackProps): React.JSX.Element | null {
  const prefersReducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [displayScore, setDisplayScore] = useState<WordScoreResult | null>(null);
  const [showFlash, setShowFlash] = useState(false);

  useEffect(() => {
    if (lastScore) {
      setDisplayScore(lastScore);
      setVisible(true);
      if (lastScore.totalScore >= 50 && !prefersReducedMotion) {
        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 200);
      }
      const timer = setTimeout(() => setVisible(false), 2500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [lastScore, prefersReducedMotion]);

  if (!displayScore || !visible) return null;

  const chipEffects = displayScore.runeEffects.filter(e => e.type === 'addPoints');
  const multEffects = displayScore.runeEffects.filter(e => e.type === 'multiply');

  return (
    <>
      {/* Gold flash for big scores */}
      {showFlash && (
        <div className="fixed inset-0 bg-tier-gold/10 pointer-events-none z-40" />
      )}

      <m.div
        className="absolute bottom-20 left-0 right-0 flex justify-center pointer-events-none z-30"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: visible ? 1 : 0, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <div className="bg-[#0A0A1A]/90 border-2 border-neo-black rounded-neo px-4 py-2 flex items-center gap-1.5 flex-wrap justify-center">
          {/* Word */}
          <span className="text-sm font-black text-neo-cream uppercase font-neo-display">
            {applyHebrewFinalLetters(displayScore.word)}
          </span>
          <span className="text-neo-cream/40">→</span>

          {/* Base points (cyan) */}
          <span className="text-sm font-bold text-neo-cyan">
            {displayScore.basePoints}
          </span>

          {/* Chip bonuses */}
          {chipEffects.map((e, i) => (
            <span key={`chip-${i}-${e.value}`} className="text-xs text-neo-cyan/70">
              +{e.value}
            </span>
          ))}

          {/* Length bonus */}
          {displayScore.lengthBonus > 1 && (
            <span className="text-sm font-bold text-neo-cream/80">
              ×{displayScore.lengthBonus}
            </span>
          )}

          {/* Mult bonuses (RED — the Balatro color) */}
          {multEffects.map((e, i) => (
            <span
              key={`mult-${i}-${e.value}`}
              className={cn(
                'text-sm font-black',
                e.value >= 3 ? 'text-neo-red motion-safe:animate-score-pop' : 'text-[#FF3366]',
              )}
            >
              ×{e.value}
            </span>
          ))}

          {/* Total (GOLD) */}
          <span className="text-neo-cream/40">=</span>
          <m.span
            className={cn(
              'font-black font-neo-display text-tier-gold',
              displayScore.totalScore >= 50 ? 'text-lg' : 'text-base',
            )}
            initial={prefersReducedMotion ? false : { scale: 1 }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {displayScore.totalScore}
          </m.span>

          {/* Big score sparkle — spins once */}
          {displayScore.totalScore >= 100 && (
            <m.span
              className="text-sm inline-block"
              animate={prefersReducedMotion ? {} : { rotate: 360 }}
              transition={{ duration: 0.5 }}
            >
              ✨
            </m.span>
          )}
        </div>
      </m.div>
    </>
  );
}
