'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  generateWordWheelPuzzle,
  isValidWordWheelWord,
  type WordWheelPuzzle,
} from '@/utils/dailyChallenge/wordWheelGeneration';
import { fastValidateWord } from '@/hooks/fastValidateWord';
import type { Language } from '@/types';

const MIN_LEN = 3;

export interface RankingPlayEmbedProps {
  locale?: string;
  puzzle?: WordWheelPuzzle;
  validateWord?: (word: string) => Promise<boolean>;
}

export function RankingPlayEmbed({
  locale = 'en',
  puzzle: puzzleProp,
  validateWord,
}: RankingPlayEmbedProps) {
  const language = (locale as Language) || 'en';
  const puzzle = useMemo(
    () => puzzleProp ?? generateWordWheelPuzzle(undefined, language),
    [puzzleProp, language],
  );

  const [current, setCurrent] = useState<string[]>([]);
  const [usedIndices, setUsedIndices] = useState<Set<number>>(() => new Set());
  const [found, setFound] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const tap = useCallback((letter: string, index: number) => {
    setUsedIndices((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      setCurrent((c) => [...c, letter]);
      return next;
    });
  }, []);

  const resetBuild = useCallback(() => {
    setCurrent([]);
    setUsedIndices(new Set());
  }, []);

  const submit = useCallback(async () => {
    const word = current.join('').toUpperCase();
    if (busy || word.length < MIN_LEN) return;
    if (found.includes(word)) {
      resetBuild();
      return;
    }
    if (!isValidWordWheelWord(word, puzzle.centerLetter, puzzle.allLetters)) {
      resetBuild();
      return;
    }
    setBusy(true);
    const check = validateWord ?? ((w: string) => fastValidateWord(w, language));
    let ok = false;
    try {
      ok = await check(word);
    } catch {
      ok = word.length >= MIN_LEN;
    }
    setBusy(false);
    if (ok) setFound((f) => [...f, word]);
    resetBuild();
  }, [busy, current, found, language, puzzle, resetBuild, validateWord]);

  const outer = puzzle.outerLetters;
  const radius = 72;

  return (
    <div
      data-testid="ranking-wheel-play"
      className="mx-auto mb-8 flex max-w-md flex-col items-center gap-4"
    >
      <p className="font-neo-display text-sm font-bold uppercase tracking-wider text-neo-lime">
        <span data-testid="found-count">{found.length}</span> words
      </p>
      <div className="relative h-44 w-44 sm:h-52 sm:w-52">
        <button
          type="button"
          aria-label={puzzle.centerLetter}
          data-wheel-index={0}
          data-wheel-letter={puzzle.centerLetter}
          onClick={() => tap(puzzle.centerLetter, 0)}
          className="absolute left-1/2 top-1/2 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-neo-black bg-neo-lime font-neo-display text-xl font-black text-neo-black shadow-[3px_3px_0px_black] disabled:opacity-40"
          disabled={usedIndices.has(0)}
        >
          {puzzle.centerLetter}
        </button>
        {outer.map((letter, i) => {
          const index = i + 1;
          const angle = (i * 360) / outer.length;
          const rad = (angle * Math.PI) / 180;
          const x = Math.sin(rad) * radius;
          const y = -Math.cos(rad) * radius;
          return (
            <button
              key={`${letter}-${index}`}
              type="button"
              aria-label={letter}
              data-wheel-index={index}
              data-wheel-letter={letter}
              onClick={() => tap(letter, index)}
              disabled={usedIndices.has(index)}
              className="absolute left-1/2 top-1/2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-neo-black bg-neo-white font-neo-display text-lg font-black text-neo-navy shadow-[2px_2px_0px_black] disabled:opacity-40"
              style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
            >
              {letter}
            </button>
          );
        })}
      </div>
      <p
        data-testid="ranking-wheel-current"
        className="min-h-8 font-neo-display text-2xl font-black tracking-[0.2em] text-neo-white"
        aria-live="polite"
      >
        {current.join('') || '\u00a0'}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={resetBuild}
          className="rounded-neo border-2 border-neo-cream/40 px-4 py-2 font-bold text-neo-cream"
        >
          Clear
        </button>
        <button
          type="button"
          data-testid="ranking-wheel-submit"
          onClick={submit}
          disabled={busy || current.length < MIN_LEN}
          className="rounded-neo border-4 border-neo-lime bg-neo-lime px-5 py-2 font-bold text-neo-navy disabled:opacity-40"
        >
          Enter
        </button>
      </div>
    </div>
  );
}
