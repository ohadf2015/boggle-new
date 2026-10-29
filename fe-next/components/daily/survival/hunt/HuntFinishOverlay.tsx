'use client';

import React, { useRef, useState } from 'react';
import { m } from 'framer-motion';
import { InlineConfetti } from '@/components/effects/InlineConfetti';
import { cn } from '@/lib/utils';
import { SPRING_PRESETS } from '@/lib/animation/presets';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import type { WordHuntSolveTier } from '@/shared/utils/wordHuntScoring';
import type { Language } from '@/types';
import { usePrefersReducedMotion } from '@/components/board/usePrefersReducedMotion';
import { SOLVE_CELEBRATION_MS } from '../constants';
import type { HuntCell } from './huntStage';
import { FLIGHT_START_MS, useLetterFlight } from './useLetterFlight';

export interface HuntFinishOverlayProps {
  outcome: 'win' | 'loss';
  targetWord: string;
  language: Language;
  tier: WordHuntSolveTier | null;
  /** Reduced effects: no confetti, no springs. */
  calm: boolean;
  onSkip: () => void;
  /** The swipe that found the word: its letters fly from these board tiles into the answer row. */
  sourcePath?: HuntCell[];
  t: (key: string) => string;
}

/** Locks the board at game over: dims it, names the outcome, pops the answer in. Tap to go to results. */
export function HuntFinishOverlay({ outcome, targetWord, language, tier, calm, onSkip, sourcePath, t }: HuntFinishOverlayProps) {
  const win = outcome === 'win';
  const word = language === 'he' ? applyHebrewFinalLetters(targetWord) : targetWord.toUpperCase();
  const letters = Array.from(word);
  const reduced = usePrefersReducedMotion();
  const still = calm || reduced;
  // Latched at mount: the held path clears while the overlay is still up.
  const [fly] = useState(() => win && !still && sourcePath?.length === letters.length);
  const rowRef = useRef<HTMLSpanElement>(null);
  useLetterFlight(rowRef, sourcePath, fly);
  const lead = fly ? FLIGHT_START_MS / 1000 : 0;
  const pop = (delay: number) => (still
    ? {}
    : { initial: { scale: 0.3, y: 14 }, animate: { scale: 1, y: 0 }, transition: { ...SPRING_PRESETS.bouncy, delay: lead + delay } });
  const headline = win ? (tier ? t(tier.labelKey) : t('wordHunt.mp.youFoundIt')) : t('closeLoss.soClose');

  return (
    <button
      type="button"
      data-testid="hunt-finish"
      data-outcome={outcome}
      data-entry={fly ? 'stamp' : undefined}
      onClick={onSkip}
      aria-label={t('common.tapToContinue')}
      className={cn(
        'absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 rounded-neo px-4 cursor-pointer select-none',
        !fly && 'bg-neo-navy/75',
      )}
    >
      {fly && (
        <m.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-neo bg-neo-navy/75"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: lead, duration: 0.2 }}
        />
      )}
      {win && !still && (
        <span className="pointer-events-none absolute inset-x-0 top-1/3 flex justify-center">
          <InlineConfetti size="lg" duration={SOLVE_CELEBRATION_MS} />
        </span>
      )}
      <m.span
        {...(fly
          ? { initial: { scale: 1.8, rotate: -10, opacity: 0 }, animate: { scale: 1, rotate: -3, opacity: 1 }, transition: { ...SPRING_PRESETS.bouncy, delay: lead } }
          : pop(0))}
        className={cn(
          'relative px-5 py-2 rounded-neo border-3 border-neo-black shadow-hard-lg font-neo-display font-black uppercase tracking-wider text-2xl sm:text-3xl text-neo-black',
          win ? (tier && tier.tier <= 1 ? 'bg-neo-yellow' : 'bg-neo-lime') : 'bg-neo-pink',
        )}
      >
        {headline}
      </m.span>
      {!win && (
        <span className="relative text-sm font-bold text-neo-white/80">{t('wordHunt.results.theTargetWordWas')}</span>
      )}
      <span ref={rowRef} dir={language === 'he' ? 'rtl' : 'ltr'} className="relative flex flex-wrap justify-center gap-1.5">
        {letters.map((letter, i) => (
          <m.span
            key={`${i}-${letter}`}
            data-testid="hunt-finish-letter"
            {...(fly ? {} : pop(0.12 + i * 0.06))}
            className={cn(
              'grid place-items-center w-10 h-12 sm:w-12 sm:h-14 rounded-neo border-3 border-neo-black shadow-hard font-neo-display font-black text-2xl sm:text-3xl',
              win ? 'bg-neo-yellow text-neo-black' : 'bg-neo-white text-neo-black',
            )}
          >
            {letter}
          </m.span>
        ))}
      </span>
      <span className="relative mt-1 text-xs font-bold uppercase tracking-widest text-neo-white/60">{t('common.tapToContinue')}</span>
    </button>
  );
}

export default HuntFinishOverlay;
