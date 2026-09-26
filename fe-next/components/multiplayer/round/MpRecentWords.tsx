'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { LadderWord } from '../desktop/WordsLadder';

export const MAX_RECENT_WORDS = 5;

/**
 * Phone only: my latest words as chips in the free stage above the board —
 * the desktop ladder's job on a screen with no room for a ladder. Newest first,
 * the SERVER's points; the newest chip drops in (transform only).
 */
function MpRecentWordsImpl({ words }: { words: LadderWord[] }) {
  if (words.length === 0) return null;
  const recent = [...words].sort((a, b) => b.ts - a.ts).slice(0, MAX_RECENT_WORDS);
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
    </ul>
  );
}

export const MpRecentWords = memo(MpRecentWordsImpl);
MpRecentWords.displayName = 'MpRecentWords';
