'use client';

import { Flame } from 'lucide-react';
import type { Difficulty } from '@/lib/crossword/types';

export interface CrosswordMastheadProps {
  /** Newspaper title, e.g. "LexiClash Daily". */
  title: string;
  /** Edition line — a formatted date for the daily, "Freeplay #N" for generated puzzles. */
  edition: string;
  difficulty: Difficulty;
  difficultyLabel: string;
  /** Current daily streak; a flame chip shows when > 0. */
  streak?: number;
  streakLabel?: string;
}

const DIFFICULTY_CHIP: Record<Difficulty, string> = {
  easy: 'bg-neo-lime text-neo-navy',
  medium: 'bg-neo-cyan text-neo-navy',
  hard: 'bg-neo-pink text-neo-white',
};

/**
 * The newspaper masthead — the single strongest "this is a real crossword" signal. A cream paper
 * banner with a hard black border (so it reads as newsprint pinned onto the dark brutalist shell),
 * a serif title + dated edition line, and the day's difficulty + streak. Deliberately restrained:
 * the brand energy is saved for the solve celebration; here the paper does the talking.
 */
export function CrosswordMasthead({
  title,
  edition,
  difficulty,
  difficultyLabel,
  streak = 0,
  streakLabel,
}: CrosswordMastheadProps) {
  return (
    <div className="shrink-0 border-neo-thick border-black bg-neo-cream rounded-neo shadow-hard-lg px-4 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`font-neo-body font-bold text-[0.6rem] uppercase tracking-[0.12em] px-2 py-0.5 rounded-full border-neo border-black ${DIFFICULTY_CHIP[difficulty]}`}
        >
          {difficultyLabel}
        </span>

        <h1 className="font-serif font-bold text-neo-navy text-lg sm:text-xl leading-none tracking-tight text-center truncate">
          {title}
        </h1>

        {streak > 0 ? (
          <span
            className="flex items-center gap-1 font-neo-display font-extrabold text-sm text-neo-navy tabular-nums"
            aria-label={streakLabel}
            title={streakLabel}
          >
            <Flame size={15} className="text-neo-orange" fill="currentColor" />
            {streak}
          </span>
        ) : (
          // keep the title centered even with no streak chip
          <span className="w-9" aria-hidden />
        )}
      </div>

      {/* Hairline rule + edition line, the masthead "dateline". */}
      <div className="mt-1.5 border-t border-black/20 pt-1 text-center">
        <p className="font-neo-body font-semibold text-[0.65rem] uppercase tracking-[0.18em] text-neo-navy/70">
          {edition}
        </p>
      </div>
    </div>
  );
}
