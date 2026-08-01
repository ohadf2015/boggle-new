'use client';

import { m } from 'framer-motion';

interface AnswerSlotsProps {
  /** Display buffer (Hebrew callers pass the sofit-applied form). */
  value: string;
  /** Number of letter cells — the canonical bridge length (a soft length clue). */
  slotCount: number;
  /** Visual state of the whole row. */
  state: 'idle' | 'correct' | 'wrong';
  dir: 'rtl' | 'ltr';
  /** Accessible label for the slot group. */
  label?: string;
}

const CELL_STATE: Record<AnswerSlotsProps['state'], { filled: string; empty: string }> = {
  idle: {
    filled: 'border-neo-purple bg-neo-purple/15 text-neo-white',
    empty: 'border-neo-white/25 bg-neo-navy text-transparent',
  },
  correct: {
    filled: 'border-neo-lime bg-neo-lime/20 text-neo-lime',
    empty: 'border-neo-lime bg-neo-lime/20 text-neo-lime',
  },
  wrong: {
    filled: 'border-neo-red bg-neo-red/15 text-neo-red',
    empty: 'border-neo-red/60 bg-neo-red/10 text-transparent',
  },
};

/**
 * Wordle-style letter cells for the bridge guess. The slot count leaks the
 * answer length on purpose — a soft clue that makes typing feel bounded and
 * satisfying instead of open-ended. Cells pop as letters land; the whole row
 * flips lime on correct via a small stagger.
 */
export default function AnswerSlots({ value, slotCount, state, dir, label }: AnswerSlotsProps) {
  const letters = [...value];
  const styles = CELL_STATE[state];
  return (
    <div
      role="group"
      aria-label={label}
      dir={dir}
      className="flex w-full flex-wrap items-center justify-center gap-1.5 py-1"
    >
      {Array.from({ length: slotCount }, (_, i) => {
        const ch = letters[i] ?? '';
        const filled = ch !== '';
        return (
          <m.span
            key={`slot-${i}`}
            data-testid="answer-slot"
            initial={false}
            animate={
              state === 'correct'
                ? { scale: [1, 1.18, 1], transition: { delay: i * 0.055, duration: 0.32 } }
                : filled
                ? { scale: [1.22, 1], transition: { duration: 0.12 } }
                : { scale: 1 }
            }
            className={[
              'flex h-12 w-10 items-center justify-center rounded-neo border-2 shadow-hard-sm',
              'font-neo-display text-2xl font-black uppercase transition-colors duration-150',
              filled ? styles.filled : styles.empty,
            ].join(' ')}
          >
            {ch}
          </m.span>
        );
      })}
    </div>
  );
}
