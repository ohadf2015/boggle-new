'use client';

import React, { useCallback, useState } from 'react';
import type { ConnectionsLandingCopy, DemoPuzzle } from '@/app/[locale]/connections/content';
import { trackLandingSampleRevealed } from '@/lib/connections/landingTelemetry';

interface Props {
  locale: string;
  copy: ConnectionsLandingCopy['samples'];
}

const DIFFICULTY_BG: Record<DemoPuzzle['difficulty'], string> = {
  easy: 'bg-neo-lime',
  medium: 'bg-neo-cyan',
  hard: 'bg-neo-pink',
};

const DIFFICULTY_TEXT: Record<DemoPuzzle['difficulty'], string> = {
  easy: 'text-neo-navy',
  medium: 'text-neo-navy',
  hard: 'text-neo-white',
};

export default function ConnectionsSampleStrip({ locale, copy }: Props): React.JSX.Element {
  return (
    <section id="how-it-works" className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h2 className="mb-2 font-neo-display text-2xl font-black sm:text-3xl">{copy.heading}</h2>
      <p className="mb-6 text-sm text-neo-gray-200">{copy.sub}</p>

      <div className="grid gap-4 sm:grid-cols-3">
        {copy.items.map((puzzle, idx) => (
          <SampleCard
            key={`${puzzle.word1}-${puzzle.word2}`}
            puzzle={puzzle}
            locale={locale}
            difficultyLabel={copy.difficultyLabels[puzzle.difficulty]}
            revealLabel={copy.revealLabel}
            position={
              idx === 0 ? 'strip-easy' : idx === 1 ? 'strip-medium' : 'strip-hard'
            }
          />
        ))}
      </div>
    </section>
  );
}

interface CardProps {
  puzzle: DemoPuzzle;
  locale: string;
  difficultyLabel: string;
  revealLabel: string;
  position: 'strip-easy' | 'strip-medium' | 'strip-hard';
}

function SampleCard({ puzzle, locale, difficultyLabel, revealLabel, position }: CardProps): React.JSX.Element {
  const [revealed, setRevealed] = useState(false);

  const handleClick = useCallback(() => {
    if (revealed) return;
    setRevealed(true);
    trackLandingSampleRevealed({ locale, position });
  }, [locale, position, revealed]);

  const bg = DIFFICULTY_BG[puzzle.difficulty];
  const fg = DIFFICULTY_TEXT[puzzle.difficulty];

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid={`sample-${position}`}
      className="flex flex-col items-stretch rounded-neo border-3 border-neo-black bg-neo-navy-light p-4 text-start shadow-hard transition-all hover:translate-y-[-2px] hover:shadow-hard-lg"
    >
      <span
        className={`mb-3 inline-block self-start rounded-neo border-2 border-neo-black px-2 py-0.5 font-neo-display text-[10px] font-black uppercase tracking-widest shadow-hard-sm ${bg} ${fg}`}
      >
        {difficultyLabel}
      </span>

      <div className="flex items-center justify-between gap-2">
        <span className="rounded-neo border-2 border-neo-black bg-neo-cream px-2 py-1 font-neo-display text-sm font-black uppercase text-neo-navy">
          {puzzle.word1}
        </span>
        <span className="font-neo-display text-base font-black text-neo-gray-300">+</span>
        <span
          className={`min-w-[4.5rem] rounded-neo border-2 border-neo-black px-2 py-1 text-center font-neo-display text-sm font-black uppercase ${
            revealed ? `${bg} ${fg} animate-neo-pop motion-reduce:animate-none` : 'bg-neo-navy text-neo-gray-300'
          }`}
        >
          {revealed ? puzzle.bridge : '???'}
        </span>
        <span className="font-neo-display text-base font-black text-neo-gray-300">+</span>
        <span className="rounded-neo border-2 border-neo-black bg-neo-cream px-2 py-1 font-neo-display text-sm font-black uppercase text-neo-navy">
          {puzzle.word2}
        </span>
      </div>

      {!revealed && (
        <span className="mt-3 text-center text-[11px] uppercase tracking-widest text-neo-gray-300">
          {revealLabel}
        </span>
      )}
    </button>
  );
}
