'use client';

import React from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SPRING_PRESETS } from '@/lib/animation/presets';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import type { FeedbackType, LetterFeedback } from '@/utils/wordHuntFeedback';

type TFn = (key: string, params?: Record<string, string | number>) => string;

export const FEEDBACK_TILE: Record<FeedbackType, string> = {
  green: 'bg-neo-lime text-neo-black',
  yellow: 'bg-neo-yellow text-neo-black',
  gray: 'bg-neo-white/35 text-neo-white',
};

const TILE_BASE =
  'flex items-center justify-center rounded-lg border-3 border-neo-black font-black shadow-hard-sm';

export function FeedbackWord({ feedback, dir, size = 'lg' }: { feedback: LetterFeedback[]; dir: 'ltr' | 'rtl'; size?: 'lg' | 'sm' }) {
  const reduce = useReducedMotion();
  return (
    <div data-testid="howto-feedback-word" dir={dir} className="flex justify-center gap-2">
      {feedback.map((fb, i) => (
        <m.span
          key={`${fb.letter}-${i}`}
          data-testid="howto-tile"
          data-feedback={fb.feedback}
          initial={reduce ? false : { scale: 0.4, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...SPRING_PRESETS.bouncy, delay: reduce ? 0 : 0.12 + i * 0.14 }}
          className={cn(TILE_BASE, size === 'lg' ? 'w-14 h-14 text-3xl' : 'w-10 h-10 text-xl', FEEDBACK_TILE[fb.feedback])}
        >
          {fb.letter}
        </m.span>
      ))}
    </div>
  );
}

/** Final Hebrew letters only belong at the end of the word; tiles carry regular forms. */
function displayLetter(letter: string, index: number, length: number, rtlWord: boolean): string {
  return rtlWord && index === length - 1 ? applyHebrewFinalLetters(letter) : letter;
}

/**
 * The hidden word as the live clue boxes show it: green letters in place, the rest unknown.
 * `present` lists letters known to be in the word but not where (the yellow ones);
 * `solved` paints every box green with a pop, the way a found word lands in the game.
 */
export function HiddenWord({
  length,
  revealed,
  dir,
  t,
  present = [],
  solved = false,
}: {
  length: number;
  revealed: Map<number, string>;
  dir: 'ltr' | 'rtl';
  t: TFn;
  present?: string[];
  solved?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-xs font-black uppercase tracking-wider text-neo-cyan">
        {t('tutorial.wordHunt.howto.hiddenLabel')}
      </span>
      <div data-testid="howto-hidden-word" data-solved={solved ? 'true' : undefined} dir={dir} className="flex justify-center gap-1.5">
        {Array.from({ length }, (_, i) => {
          const raw = revealed.get(i);
          const letter = raw ? displayLetter(raw, i, length, dir === 'rtl') : undefined;
          return (
            <m.span
              key={`${i}-${letter ?? ''}`}
              data-testid="howto-hidden-box"
              data-filled={letter ? 'true' : undefined}
              initial={reduce || !letter ? false : { scale: 0.5, y: -6 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ ...SPRING_PRESETS.bouncy, delay: reduce ? 0 : (solved ? i * 0.08 : 0.15) }}
              className={cn(
                TILE_BASE,
                'w-11 h-11 text-xl',
                letter ? FEEDBACK_TILE.green : 'bg-neo-navy-light text-neo-white/50 border-dashed',
              )}
            >
              {letter ?? '?'}
            </m.span>
          );
        })}
      </div>
      {present.length > 0 && !solved && (
        <div data-testid="howto-present-letters" dir={dir} className="flex items-center gap-1.5 text-xs font-bold text-neo-white/80">
          <span>{t('tutorial.wordHunt.lesson.alsoInWord')}</span>
          {present.map((letter, i) => (
            <span key={`${letter}-${i}`} className={cn(TILE_BASE, 'h-7 w-7 text-sm', FEEDBACK_TILE.yellow)}>
              {letter}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** The life bar from the game, in miniature: it drains in play and short words refill it. */
export function LifeMeter({ value, gain, t }: { value: number; gain?: number; t: TFn }) {
  const reduce = useReducedMotion();
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div data-testid="howto-life" data-life={Math.round(pct)} className="flex w-full max-w-[17rem] items-center gap-2">
      <Heart aria-hidden="true" className="h-5 w-5 shrink-0 fill-neo-pink text-neo-pink" />
      <div
        role="meter"
        aria-label={t('tutorial.wordHunt.lesson.lifeLabel')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        className="relative h-4 flex-1 overflow-hidden rounded-full border-2 border-neo-black bg-neo-navy-light"
      >
        <m.div
          className={cn('h-full rounded-full', pct < 35 ? 'bg-neo-red' : 'bg-neo-pink')}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 160, damping: 22 }}
        />
      </div>
      <span dir="ltr" className="min-w-[2.5rem] text-end text-sm font-black text-neo-lime" aria-live="polite">
        {gain ? `+${gain}` : ''}
      </span>
    </div>
  );
}

export function FeedbackLegend({ t }: { t: TFn }) {
  const rows: Array<[FeedbackType, string]> = [
    ['green', 'wordHunt.feedback.correct'],
    ['yellow', 'wordHunt.feedback.wrongPlace'],
    ['gray', 'wordHunt.feedback.notInWord'],
  ];
  return (
    <ul className="flex flex-col gap-2 rounded-neo border-3 border-neo-black bg-neo-navy-light p-3 shadow-hard">
      {rows.map(([state, key]) => (
        <li key={state} className="flex items-center gap-3 text-sm font-bold text-neo-white">
          <span aria-hidden="true" className={cn('h-6 w-6 shrink-0 rounded-md border-2 border-neo-black', FEEDBACK_TILE[state])} />
          {t(key)}
        </li>
      ))}
    </ul>
  );
}
