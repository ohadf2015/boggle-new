'use client';

import React from 'react';
import { m } from 'framer-motion';
import { InlineConfetti } from '@/components/effects/InlineConfetti';
import { cn } from '@/lib/utils';
import { SPRING_PRESETS } from '@/lib/animation/presets';
import { pluralKey } from '@/lib/i18n/pluralKey';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import type { Language } from '@/types';
import { usePrefersReducedMotion } from '@/components/board/usePrefersReducedMotion';
import { SOLVE_CELEBRATION_MS } from '../constants';

export interface HuntFinishOverlayProps {
  outcome: 'win' | 'loss';
  targetWord: string;
  language: Language;
  /** Guesses spent on the hidden word, the same count the tries row shows. */
  tries: number;
  /** Reduced effects: no confetti, no springs. */
  calm: boolean;
  onSkip: () => void;
  /** A timed round's clock ran out (Quick Play): say so instead of "So close". */
  timedOut?: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const TRIES_FORMS = {
  one: 'wordHunt.survival.solved.inTries_one',
  few: 'wordHunt.survival.solved.inTries_few',
  many: 'wordHunt.survival.solved.inTries_many',
  other: 'wordHunt.survival.solved.inTries_other',
};

function triesLine(tries: number, language: Language, t: HuntFinishOverlayProps['t']): string {
  if (tries <= 1) return t('wordHunt.survival.solved.firstTry');
  return t(pluralKey(TRIES_FORMS, tries, language), { count: tries });
}

/**
 * Locks the board at game over. A solve stamps "Solved!" and the tries it took (the clue boxes
 * above already turn over to the word); a loss reveals the word. It leaves for results on its own
 * within two seconds, so a tap is only a shortcut and gets no printed hint.
 */
export function HuntFinishOverlay({ outcome, targetWord, language, tries, calm, onSkip, timedOut = false, t }: HuntFinishOverlayProps) {
  const win = outcome === 'win';
  const reduced = usePrefersReducedMotion();
  const still = calm || reduced;
  const pop = (delay: number) => (still
    ? {}
    : { initial: { scale: 0.3, y: 14 }, animate: { scale: 1, y: 0 }, transition: { ...SPRING_PRESETS.bouncy, delay } });
  const headline = win ? t('wordHunt.survival.solved.title') : timedOut ? t('wordWheel.gameOver') : t('closeLoss.soClose');
  const letters = win ? [] : Array.from(language === 'he' ? applyHebrewFinalLetters(targetWord) : targetWord.toUpperCase());

  return (
    <button
      type="button"
      data-testid="hunt-finish"
      data-outcome={outcome}
      onClick={onSkip}
      aria-label={t('common.tapToContinue')}
      className={cn(
        'absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 rounded-neo px-4 cursor-pointer select-none',
        win ? 'bg-neo-navy/60' : 'bg-neo-navy/75',
      )}
    >
      {win && !still && (
        <span className="pointer-events-none absolute inset-x-0 top-1/3 flex justify-center">
          <InlineConfetti size="lg" duration={SOLVE_CELEBRATION_MS} />
        </span>
      )}
      <m.span
        data-testid="hunt-finish-headline"
        {...(win && !still
          ? { initial: { scale: 2.2, rotate: -14 }, animate: { scale: 1, rotate: -3 }, transition: { ...SPRING_PRESETS.bouncy, delay: 0.15 } }
          : pop(0))}
        className={cn(
          'relative rounded-neo border-3 border-neo-black font-neo-display font-black uppercase tracking-wider text-neo-black',
          win ? 'px-7 py-3 bg-neo-lime shadow-hard-lg text-4xl sm:text-5xl' : 'px-5 py-2 bg-neo-pink shadow-hard-lg text-2xl sm:text-3xl',
        )}
      >
        {headline}
      </m.span>
      {win && (
        <m.span
          data-testid="hunt-finish-tries"
          {...pop(0.35)}
          className="relative px-3 py-1 rounded-neo border-2 border-neo-black bg-neo-cyan text-neo-black shadow-hard-sm font-neo-display font-black text-lg sm:text-xl"
        >
          {triesLine(tries, language, t)}
        </m.span>
      )}
      {!win && (
        <>
          <span className="relative text-sm font-bold text-neo-white/80">{t('wordHunt.results.theTargetWordWas')}</span>
          <span dir={language === 'he' ? 'rtl' : 'ltr'} className="relative flex flex-wrap justify-center gap-1.5">
            {letters.map((letter, i) => (
              <m.span
                key={`${i}-${letter}`}
                data-testid="hunt-finish-letter"
                {...pop(0.12 + i * 0.06)}
                className="grid place-items-center w-10 h-12 sm:w-12 sm:h-14 rounded-neo border-3 border-neo-black shadow-hard bg-neo-white text-neo-black font-neo-display font-black text-2xl sm:text-3xl"
              >
                {letter}
              </m.span>
            ))}
          </span>
        </>
      )}
    </button>
  );
}

export default HuntFinishOverlay;
