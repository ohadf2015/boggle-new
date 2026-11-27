'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { cn } from '@/lib/utils';
import { AutoHideHeader } from '@/components/AutoHideHeader';
import { LandingPage } from '@/components/landing/kit';
import { PAPER, SOLVE_BUTTON, TEXT_INPUT } from '../tools/word-solver/solverStyles';
import { nextGuess, type Clue } from '@/lib/wordleSolver/solver';
import { cycleMark, type Mark } from './tiles';

const ALL_GRAY: Mark[] = ['b', 'b', 'b', 'b', 'b'];
const MARK_CLASS: Record<Mark, string> = {
  b: 'bg-neo-gray-500 text-neo-white',
  y: 'bg-neo-yellow text-neo-black',
  g: 'bg-neo-lime text-neo-black',
};
const MARK_NAME: Record<Mark, string> = { b: 'gray', y: 'yellow', g: 'green' };
const SHOWN_CANDIDATES = 60;

const tileClass =
  'w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center border-3 border-neo-black rounded-neo font-neo-display text-2xl font-bold uppercase shadow-hard-sm';

export default function WordleSolverPageClient({ children }: { children?: React.ReactNode }) {
  const [clues, setClues] = useState<Clue[]>([]);
  const [typed, setTyped] = useState<string | null>(null);
  const [marks, setMarks] = useState<Mark[]>(ALL_GRAY);

  const { guess: suggestion, candidates } = useMemo(() => nextGuess(clues), [clues]);
  const word = (typed ?? suggestion ?? '').toLowerCase();
  const solved = clues[clues.length - 1]?.pattern === 'ggggg';
  const canSubmit = /^[a-z]{5}$/.test(word) && !solved && candidates.length > 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setClues((prev) => [...prev, { guess: word, pattern: marks.join('') }]);
    setTyped(null);
    setMarks(ALL_GRAY);
  };

  const undo = () => {
    setClues((prev) => prev.slice(0, -1));
    setTyped(null);
    setMarks(ALL_GRAY);
  };

  const reset = () => {
    setClues([]);
    setTyped(null);
    setMarks(ALL_GRAY);
  };

  return (
    <div dir="ltr" className="min-h-dvh bg-neo-navy">
      <AutoHideHeader />
      <LandingPage locale="en" topBar={false}>
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.1fr] lg:gap-x-12 lg:pt-6">
        <header className="flex flex-col gap-4">
          <h1 className="font-neo-display text-[2rem] font-bold leading-[1.1] text-balance sm:text-5xl" data-speakable="true">
            Wordle Solver: Get the Best Next Guess
          </h1>
          <p className="text-lg leading-relaxed text-neo-white/85">
            Play the word below, tap the tiles to copy the colors your game gave you, and get your next guess.
          </p>
        </header>

        <form
          onSubmit={submit}
          className={cn(PAPER, 'p-5 sm:p-7')}
          aria-label="Wordle solver"
        >
          <div className="flex flex-col items-center gap-2 mb-5">
            {clues.map((clue, row) => (
              <div key={row} className="flex gap-2" aria-label={`Guess ${row + 1}: ${clue.guess}`}>
                {[...clue.guess].map((letter, i) => (
                  <span key={i} className={cn(tileClass, MARK_CLASS[clue.pattern[i] as Mark])}>
                    {letter}
                  </span>
                ))}
              </div>
            ))}

            {!solved && candidates.length > 0 && (
              <p className="mt-2 text-sm font-bold">Tap each tile until it matches your game</p>
            )}
            {!solved && candidates.length > 0 && (
              <div className="flex gap-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setMarks((prev) => prev.map((m, j) => (j === i ? cycleMark(m) : m)))}
                    aria-label={`Letter ${i + 1}${word[i] ? ` ${word[i].toUpperCase()}` : ''}, ${MARK_NAME[marks[i]]}. Tap to change color.`}
                    className={cn(
                      tileClass,
                      MARK_CLASS[marks[i]],
                      'ring-offset-2 ring-offset-neo-cream focus-visible:ring-3 focus-visible:ring-neo-cyan',
                    )}
                  >
                    {word[i] ?? ''}
                  </button>
                ))}
              </div>
            )}
          </div>

          {solved ? (
            <p className="mb-4 rounded-neo-lg border-3 border-neo-black bg-neo-lime p-3 text-center font-neo-display text-xl font-bold">
              Solved in {clues.length} {clues.length === 1 ? 'guess' : 'guesses'}.
            </p>
          ) : candidates.length === 0 ? (
            <p className="mb-4 rounded-neo-lg border-3 border-neo-black bg-neo-pink p-3 text-center font-bold" role="alert">
              No Wordle answer fits those colors. Check for a mis-tapped tile and undo the last row.
            </p>
          ) : (
            <>
              {typed === null && suggestion && !candidates.includes(suggestion) && (
                <p className="mb-3 text-center text-sm">
                  {suggestion.toUpperCase()} can&apos;t be the answer, but it tells the last {candidates.length} apart
                  in one go.
                </p>
              )}
              <div className="flex flex-col gap-3">
                <div className="flex-1">
                  <label htmlFor="ws-word" className="mb-1.5 block text-sm font-bold">
                    Played a different word? Type it here
                  </label>
                  <input
                    id="ws-word"
                    value={word}
                    onChange={(e) => setTyped(e.target.value.replace(/[^a-z]/gi, '').slice(0, 5))}
                    maxLength={5}
                    autoComplete="off"
                    spellCheck={false}
                    className={cn(TEXT_INPUT, 'uppercase')}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={SOLVE_BUTTON}
                >
                  Next guess
                </button>
              </div>
            </>
          )}

          {clues.length > 0 && (
            <div className="flex justify-center gap-3 mt-4">
              <button type="button" onClick={undo} className="min-h-11 font-bold underline decoration-neo-pink decoration-2 underline-offset-2">
                Undo last row
              </button>
              <button type="button" onClick={reset} className="min-h-11 font-bold underline decoration-neo-pink decoration-2 underline-offset-2">
                Start over
              </button>
            </div>
          )}
        </form>
        </div>

        {!solved && candidates.length > 0 && (
          <section
            className={cn(PAPER, 'p-5 sm:p-7')}
            aria-live="polite"
          >
            <h2 className="mb-3 font-neo-display text-xl font-bold">
              {candidates.length.toLocaleString('en-US')}{' '}
              {candidates.length === 1 ? 'answer fits' : 'answers still fit'}
            </h2>
            <p className="break-words font-mono uppercase leading-relaxed tracking-wide">
              {candidates.slice(0, SHOWN_CANDIDATES).join(' ')}
              {candidates.length > SHOWN_CANDIDATES && ' …'}
            </p>
          </section>
        )}
        {children}
      </LandingPage>
    </div>
  );
}
