'use client';

import React from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SPRING_PRESETS } from '@/lib/animation/presets';
import type { FeedbackType, LetterFeedback } from '@/utils/wordHuntFeedback';

type TFn = (key: string) => string;

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

/** The hidden word as the live clue boxes show it: green letters in place, the rest unknown. */
export function HiddenWord({ length, revealed, dir, t }: { length: number; revealed: Map<number, string>; dir: 'ltr' | 'rtl'; t: TFn }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-xs font-black uppercase tracking-wider text-neo-cyan">
        {t('tutorial.wordHunt.howto.hiddenLabel')}
      </span>
      <div data-testid="howto-hidden-word" dir={dir} className="flex justify-center gap-1.5">
        {Array.from({ length }, (_, i) => {
          const letter = revealed.get(i);
          return (
            <span
              key={i}
              data-testid="howto-hidden-box"
              className={cn(
                TILE_BASE,
                'w-10 h-10 text-lg',
                letter ? FEEDBACK_TILE.green : 'bg-neo-navy-light text-neo-white/50 border-dashed',
              )}
            >
              {letter ?? '?'}
            </span>
          );
        })}
      </div>
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
