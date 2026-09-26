'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { LadderWord } from '../desktop/WordsLadder';

/** Chips the phone trail shows; older words fold into one "+N" chip (at most ~3 rows on a 390px phone). */
export const MAX_RECENT_WORDS = 12;

/**
 * Phone only: my words as a trail of chips in the free stage above the board —
 * the desktop ladder's job on a screen with no room for a ladder. Newest first,
 * the SERVER's points; the newest chip drops in (transform only). Before the
 * first word the stage carries the mode's one-line rule, quietly.
 */
function MpRecentWordsImpl({ words, emptyHint }: { words: LadderWord[]; emptyHint?: string }) {
  if (words.length === 0) {
    return emptyHint ? (
      <p data-testid="mp-words-hint" dir="auto" className="lg:hidden px-6 pt-4 text-center text-sm font-bold leading-snug text-neo-white/50 text-balance">
        {emptyHint}
      </p>
    ) : null;
  }
  const newestFirst = [...words].sort((a, b) => b.ts - a.ts);
  const recent = newestFirst.slice(0, MAX_RECENT_WORDS);
  const more = newestFirst.length - recent.length;
  return (
    <ul data-testid="mp-recent-words" className="lg:hidden flex flex-wrap justify-center gap-1.5 px-3 pt-2" aria-hidden="true">
      {recent.map((w, i) => (
        <li
          key={`${w.word}-${w.ts}`}
          data-testid="mp-recent-word"
          className={cn(
            'inline-flex items-baseline gap-1 rounded-full border-2 border-neo-black px-2.5 py-0.5 font-neo-display font-bold uppercase text-sm shadow-hard-sm',
            i === 0 ? 'bg-neo-lime text-neo-black animate-mp-drop' : 'bg-neo-navy-light text-neo-white/80',
          )}
        >
          <span dir="auto">{w.word}</span>
          {w.score > 0 && <span data-testid="mp-recent-word-points" dir="ltr" className="text-xs tabular-nums opacity-80">+{w.score}</span>}
        </li>
      ))}
      {more > 0 && (
        <li data-testid="mp-recent-more" dir="ltr" className="inline-flex items-center rounded-full border-2 border-dashed border-neo-white/30 px-2.5 py-0.5 text-sm font-bold tabular-nums text-neo-white/60">
          +{more}
        </li>
      )}
    </ul>
  );
}

export const MpRecentWords = memo(MpRecentWordsImpl);
MpRecentWords.displayName = 'MpRecentWords';
