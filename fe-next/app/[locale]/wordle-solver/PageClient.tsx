'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { cn } from '@/lib/utils';
import { AutoHideHeader } from '@/components/AutoHideHeader';
import { nextGuess, type Clue } from '@/lib/wordleSolver/solver';
import { cycleMark, type Mark } from './tiles';

const ALL_GRAY: Mark[] = ['b', 'b', 'b', 'b', 'b'];
const MARK_CLASS: Record<Mark, string> = {
  b: 'bg-neo-gray-500 text-white',
  y: 'bg-neo-yellow text-neo-black',
  g: 'bg-neo-lime text-neo-black',
};
const MARK_NAME: Record<Mark, string> = { b: 'gray', y: 'yellow', g: 'green' };
const SHOWN_CANDIDATES = 60;

const tileClass =
  'w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center border-3 border-neo-black rounded-neo font-neo-display text-2xl font-bold uppercase shadow-hard-sm';

export default function WordleSolverPageClient() {
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
    <div dir="ltr" className="bg-neo-navy">
      <AutoHideHeader />
      <main className="max-w-4xl mx-auto px-4 pt-8">
        <header className="mb-8 text-center">
          <h1 className="font-neo-display text-3xl sm:text-4xl font-bold text-neo-yellow mb-2" data-speakable="true">
            Wordle Solver: Get the Best Next Guess
          </h1>
          <p className="text-neo-white text-lg">
            Play the word below, tap the tiles to copy the colors your game gave you, and get your next guess.
          </p>
        </header>

        <form
          onSubmit={submit}
          className="bg-neo-navy-light border-3 border-neo-black shadow-hard rounded-neo p-5 sm:p-6 mb-6"
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
              <p className="mt-2 text-sm font-bold text-neo-cyan">Tap each tile until it matches your game</p>
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
                      'ring-offset-2 ring-offset-neo-navy-light focus-visible:ring-2 focus-visible:ring-neo-cyan',
                    )}
                  >
                    {word[i] ?? ''}
                  </button>
                ))}
              </div>
            )}
          </div>

          {solved ? (
            <p className="text-center font-neo-display text-xl font-bold text-neo-lime mb-4">
              Solved in {clues.length} {clues.length === 1 ? 'guess' : 'guesses'}.
            </p>
          ) : candidates.length === 0 ? (
            <p className="text-center text-neo-white mb-4" role="alert">
              No Wordle answer fits those colors. Check for a mis-tapped tile and undo the last row.
            </p>
          ) : (
            <>
              {typed === null && suggestion && !candidates.includes(suggestion) && (
                <p className="text-center text-sm text-neo-white mb-3">
                  {suggestion.toUpperCase()} can&apos;t be the answer, but it tells the last {candidates.length} apart
                  in one go.
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                <div className="flex-1">
                  <label htmlFor="ws-word" className="block font-neo-display text-sm font-bold text-neo-white mb-1.5">
                    Played a different word? Type it here
                  </label>
                  <input
                    id="ws-word"
                    value={word}
                    onChange={(e) => setTyped(e.target.value.replace(/[^a-z]/gi, '').slice(0, 5))}
                    maxLength={5}
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full px-3 py-2.5 text-lg font-mono font-bold tracking-widest uppercase bg-white text-neo-black border-3 border-neo-black rounded-neo shadow-hard-sm focus:outline-hidden focus:ring-2 focus:ring-neo-cyan"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="px-6 py-3 font-neo-display font-bold text-lg bg-neo-lime text-neo-black border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-pressed transition-shadow duration-100 disabled:opacity-50"
                >
                  Next guess
                </button>
              </div>
            </>
          )}

          {clues.length > 0 && (
            <div className="flex justify-center gap-3 mt-4">
              <button type="button" onClick={undo} className="text-neo-cyan underline font-bold">
                Undo last row
              </button>
              <button type="button" onClick={reset} className="text-neo-cyan underline font-bold">
                Start over
              </button>
            </div>
          )}
        </form>

        {!solved && candidates.length > 0 && (
          <section
            className="bg-neo-navy-light border-3 border-neo-black rounded-neo p-5 sm:p-6 mb-6"
            aria-live="polite"
          >
            <h2 className="font-neo-display text-xl font-bold text-white mb-3">
              {candidates.length.toLocaleString('en-US')}{' '}
              {candidates.length === 1 ? 'answer fits' : 'answers still fit'}
            </h2>
            <p className="font-mono text-neo-white uppercase tracking-wide break-words leading-relaxed">
              {candidates.slice(0, SHOWN_CANDIDATES).join(' ')}
              {candidates.length > SHOWN_CANDIDATES && ' …'}
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
