'use client';

import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';

export type LetterFeedback = 'correct' | 'present' | 'absent';

export interface GuessRow {
  word: string;
  feedback: LetterFeedback[];
}

interface Props {
  rows: GuessRow[];
  dir?: 'ltr' | 'rtl';
}

const TONE: Record<LetterFeedback, string> = {
  correct: 'bg-neo-lime text-neo-black border-neo-black',
  present: 'bg-neo-yellow text-neo-black border-neo-black',
  absent: 'bg-neo-navy-light text-neo-white border-neo-cream/30',
};

/**
 * Wordle-style guess history — one row per submitted word, one tile per
 * letter, color-coded by feedback. Mirrors the live Word Hunt feedback
 * grid (`WordHuntTargetArea`) so practice carries the same visual language.
 */
export default function PracticeGuessHistory({ rows, dir = 'ltr' }: Props) {
  if (rows.length === 0) return null;
  return (
    <ul
      data-testid="practice-guess-history"
      dir={dir}
      className="flex flex-col gap-1 w-full items-center"
    >
      {rows.map((row, rowIdx) => (
        <li
          key={`${row.word}-${rowIdx}`}
          data-testid={`practice-guess-row-${rowIdx}`}
          className="flex gap-1"
        >
          {row.word.split('').map((ch, i) => (
            <AdaptiveMotion.span
              key={`${rowIdx}-${i}-${ch}`}
              initial={{ rotateX: 90, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 text-sm font-neo-display font-black border-2 rounded shadow-hard-sm ${TONE[row.feedback[i] ?? 'absent']}`}
            >
              {ch}
            </AdaptiveMotion.span>
          ))}
        </li>
      ))}
    </ul>
  );
}

/**
 * Pure helper — Wordle-style scoring: first pass marks 'correct' (right
 * letter, right slot), second pass marks 'present' (right letter, wrong
 * slot) without double-counting target letters. Anything else = 'absent'.
 */
export function computeFeedback(guess: string, target: string): LetterFeedback[] {
  const result: LetterFeedback[] = new Array(guess.length).fill('absent');
  const targetChars = target.split('');
  const guessChars = guess.split('');
  // Pass 1: exact-position matches consume the target slot.
  for (let i = 0; i < guessChars.length; i++) {
    if (i < targetChars.length && targetChars[i] === guessChars[i]) {
      result[i] = 'correct';
      targetChars[i] = '\0';
      guessChars[i] = '\0';
    }
  }
  // Pass 2: present-but-wrong-slot — only count if target still has it.
  for (let i = 0; i < guessChars.length; i++) {
    const ch = guessChars[i];
    if (ch === '\0') continue;
    const idx = targetChars.indexOf(ch);
    if (idx >= 0) {
      result[i] = 'present';
      targetChars[idx] = '\0';
    }
  }
  return result;
}
