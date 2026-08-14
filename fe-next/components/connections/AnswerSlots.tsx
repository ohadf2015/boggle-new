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
/**
 * Each cell takes an equal share of the row: the row (100cqi) minus its gaps
 * (0.375rem each, matching `gap-1.5`), divided by `--slots`, capped at 2.5rem so
 * a 3-letter answer doesn't render giant cells. Because the shares always sum to
 * the row width, N cells fit at any N — that is what lets the row be
 * `flex-nowrap` without ever overflowing. Font size keeps the original
 * text-2xl:w-10 ratio (1.5 / 2.5 = 0.6) as the cell shrinks.
 *
 * Written out literally rather than composed from constants: Tailwind only
 * generates an arbitrary value it can see verbatim in the source.
 */
const CELL_W = 'w-[min(2.5rem,calc((100cqi-(var(--slots)-1)*var(--gap))/var(--slots)))]';
const CELL_TEXT =
  'text-[calc(min(2.5rem,calc((100cqi-(var(--slots)-1)*var(--gap))/var(--slots)))*0.6)]';

/**
 * Long answers spend most of the row on gaps: at 14 cells the default 0.375rem
 * gutters eat 78px of a ~280px phone row, leaving 14px cells. Tightening the
 * gutter past 8 cells buys back about a quarter of each cell's width, which is
 * the difference between a legible letter and a smudge. Short answers keep the
 * roomier default.
 */
const TIGHT_GAP_FROM = 8;

export default function AnswerSlots({ value, slotCount, state, dir, label }: AnswerSlotsProps) {
  const letters = [...value];
  const styles = CELL_STATE[state];
  return (
    <div
      role="group"
      aria-label={label}
      dir={dir}
      className="flex w-full flex-nowrap items-center justify-center gap-[var(--gap)] py-1"
      style={{
        containerType: 'inline-size',
        ['--slots' as string]: slotCount,
        ['--gap' as string]: slotCount > TIGHT_GAP_FROM ? '0.125rem' : '0.375rem',
      }}
    >
      {Array.from({ length: slotCount }, (_, i) => {
        const ch = letters[i] ?? '';
        const filled = ch !== '';
        // The next empty cell pulses so players see where the letter lands.
        const active = state === 'idle' && !filled && i === letters.length;
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
              // aspect-[5/6] keeps the original 2.5rem x 3rem proportions while shrinking.
              `flex min-w-0 aspect-[5/6] ${CELL_W} ${CELL_TEXT}`,
              'items-center justify-center rounded-neo border-2 shadow-hard-sm',
              'font-neo-display font-black uppercase leading-none transition-colors duration-150',
              filled ? styles.filled : styles.empty,
              active ? 'animate-pulse border-neo-purple/80' : '',
            ].join(' ')}
          >
            {ch}
          </m.span>
        );
      })}
    </div>
  );
}
