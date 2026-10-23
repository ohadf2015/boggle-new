'use client';

import { m, useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ConnectionPuzzle } from '@/lib/connections/types';
import { whyItWorks } from '@/lib/connections/whyItWorks';
import { Sparkles } from 'lucide-react';

interface BridgeSolveRevealProps {
  /** The puzzle that was solved. */
  puzzle: ConnectionPuzzle;
  /** Current language for whyItWorks compound derivation. */
  language: string;
  /** True when the bridge was solved correctly; shows celebratory reveal. */
  isCorrect: boolean;
}

/**
 * The "aha" payoff moment — reveals the two real compound words the bridge unlocks.
 * Shows the word1+bridge compound and the bridge+word2 compound as a celebratory
 * golden reveal (neo-yellow reserved for celebration per design system).
 *
 * Respects prefers-reduced-motion for entrance animations.
 */
export function BridgeSolveReveal({ puzzle, language, isCorrect }: BridgeSolveRevealProps) {
  const { t, dir } = useLanguage();
  const reducedMotion = useReducedMotion();

  if (!isCorrect) {
    return null;
  }

  const { left, right } = whyItWorks(puzzle, language);

  return (
    <m.div
      key="solve-reveal"
      data-testid="bridge-solve-reveal"
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { type: 'spring', stiffness: 300, damping: 22, delay: 0.15 }
      }
      className="mb-3 mt-1 flex flex-col items-center gap-3 rounded-neo border-2 border-neo-yellow bg-neo-navy px-4 py-4 shadow-hard-sm"
      dir={dir}
    >
      <div className="flex items-center gap-2">
        <m.span
          aria-hidden="true"
          initial={reducedMotion ? false : { scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { type: 'spring', stiffness: 400, damping: 16, delay: 0.25 }
          }
          className="text-neo-yellow"
        >
          <Sparkles className="w-5 h-5" />
        </m.span>
        <span className="text-neo-yellow text-xs font-neo-body font-bold uppercase tracking-[0.18em] rtl:tracking-normal">
          {t('connections.whyItWorks')}
        </span>
        <m.span
          aria-hidden="true"
          initial={reducedMotion ? false : { scale: 0, rotate: 180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { type: 'spring', stiffness: 400, damping: 16, delay: 0.3 }
          }
          className="text-neo-yellow"
        >
          <Sparkles className="w-5 h-5" />
        </m.span>
      </div>

      <div
        className="flex flex-wrap items-center justify-center gap-3"
        dir={dir}
      >
        <m.span
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.8, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : {
                  type: 'spring',
                  stiffness: 350,
                  damping: 18,
                  delay: 0.35,
                }
          }
          className="rounded-neo border-2 border-neo-black bg-neo-yellow px-3.5 py-1.5 font-neo-display font-black text-base text-neo-navy shadow-hard-sm"
        >
          {left}
        </m.span>

        <span
          className="text-neo-yellow text-sm font-black select-none"
          aria-hidden="true"
        >
          ✓
        </span>

        <m.span
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.8, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : {
                  type: 'spring',
                  stiffness: 350,
                  damping: 18,
                  delay: 0.4,
                }
          }
          className="rounded-neo border-2 border-neo-black bg-neo-yellow px-3.5 py-1.5 font-neo-display font-black text-base text-neo-navy shadow-hard-sm"
        >
          {right}
        </m.span>
      </div>
    </m.div>
  );
}
