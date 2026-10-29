'use client';

import { cn } from '@/lib/utils';
import { TILE_VISUALS } from '../legacy/blastTileVisuals';
import type { BlastResultsT } from './types';

const FACE = TILE_VISUALS.standard;

/** The run's best word, spelled in the board's own tile faces. */
export function BlastBestWordTiles({ word, longestWord, t }: { word: string | null; longestWord: string | null; t: BlastResultsT }) {
  if (!word) return null;
  const letters = Array.from(word);
  const size = letters.length > 8 ? 'h-7 w-7 text-sm tv:h-11 tv:w-11 tv:text-xl' : 'h-9 w-9 text-lg tv:h-14 tv:w-14 tv:text-3xl';

  return (
    <section
      data-testid="blast-results-best-word"
      className="w-full rounded-neo border-3 border-neo-black bg-neo-navy-light px-3 py-2.5 shadow-hard"
    >
      <h3 className="text-center font-neo-display text-xs font-black uppercase tracking-[0.18em] text-neo-white tv:text-lg">
        {t('blast.results.bestWord')}
      </h3>
      <div dir="auto" className="mt-2 flex flex-wrap justify-center gap-1">
        {letters.map((letter, i) => (
          <span
            key={i}
            data-letter={letter}
            data-reveal="tile"
            className={cn('flex items-center justify-center rounded-md font-neo-display font-black uppercase leading-none', size, FACE.text)}
            style={FACE.style}
          >
            {letter}
          </span>
        ))}
      </div>
      {longestWord && (
        <p className="mt-2 text-center text-[11px] font-bold uppercase tracking-wider text-neo-white">
          {t('blast.results.reveal.longestWord')}{' '}
          <bdi className="font-neo-display font-black text-neo-cyan">{longestWord}</bdi>
        </p>
      )}
    </section>
  );
}
