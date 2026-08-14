'use client';

import { m } from 'framer-motion';
import { Check, X } from 'lucide-react';
import type { ConnectionPuzzle } from '@/lib/connections/types';

interface DailyAnswerKeyProps {
  puzzles: readonly ConnectionPuzzle[];
  /** Indices the player actually solved. Everything else is shown as taught. */
  solvedIndices: ReadonlySet<number>;
  /** Localized section heading (caller passes t()). */
  title: string;
  isRTL?: boolean;
}

/**
 * The day's answer key, shown on the results screen.
 *
 * A player who solved nothing used to leave with a bare "0" and no idea what
 * the answers were — the round taught them nothing and gave them no reason to
 * come back. Listing every bridge (solved or not) turns a loss into the
 * teach-moment the mode is actually about.
 */
export default function DailyAnswerKey({ puzzles, solvedIndices, title, isRTL = false }: DailyAnswerKeyProps) {
  if (puzzles.length === 0) return null;

  return (
    <section
      data-testid="daily-answer-key"
      className="flex flex-col gap-1.5 rounded-neo border-neo border-neo-white/15 bg-neo-navy/60 p-3"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <h2 className="text-center font-neo-body text-[0.7rem] font-bold uppercase tracking-[0.18em] text-neo-white/45">
        {title}
      </h2>
      {puzzles.map((p, i) => {
        const solved = solvedIndices.has(i);
        return (
          <m.div
            key={p.id}
            data-testid="answer-key-row"
            data-solved={solved}
            initial={{ opacity: 0, x: isRTL ? 8 : -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.06, type: 'spring', stiffness: 320, damping: 24 }}
            // Tiles can be phrases ("del juicio", "אל פנים"), so each word is
            // kept whole and the row is allowed to break BETWEEN words instead —
            // a break there separates two words, a break inside one splits a
            // phrase in half. The wider horizontal gap keeps three separate
            // words from reading as one run-on.
            className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 font-neo-display text-sm"
          >
            {solved ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-neo-lime" strokeWidth={3} aria-hidden="true" />
            ) : (
              <X className="h-3.5 w-3.5 shrink-0 text-neo-red" strokeWidth={3} aria-hidden="true" />
            )}
            <span className="whitespace-nowrap text-neo-white/55">{p.word1}</span>
            <span
              className={`whitespace-nowrap rounded px-1.5 py-0.5 font-black ${
                solved ? 'bg-neo-lime/15 text-neo-lime' : 'bg-neo-cyan/15 text-neo-cyan'
              }`}
            >
              {p.bridge}
            </span>
            <span className="whitespace-nowrap text-neo-white/55">{p.word2}</span>
          </m.div>
        );
      })}
    </section>
  );
}
