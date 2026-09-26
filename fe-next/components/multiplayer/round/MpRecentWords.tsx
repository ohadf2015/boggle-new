'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { LadderWord } from '../desktop/WordsLadder';

/** Chips the phone trail shows; older words fold into one "+N" chip (at most ~3 rows on a 390px phone). */
export const MAX_RECENT_WORDS = 12;

/**
 * Phone only: my words in the free stage above the board — the desktop
 * ladder's job on a screen with no room for a ladder. A RECORD, not an event:
 * the accept moment already has its one channel (the word pill by the board +
 * the server "+N" floater), so the trail never stamps, animates or repeats the
 * points — words only, the newest chip wearing a lime edge. Newest first
 * (server accepts included). Before the first word the stage carries the
 * mode's one-line rule, quietly.
 */
function MpRecentWordsImpl({ words, emptyHint, label }: { words: LadderWord[]; emptyHint?: string; label?: string }) {
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
    <ul data-testid="mp-recent-words" className="lg:hidden flex flex-wrap items-center justify-center gap-1.5 px-3 pt-2" aria-hidden="true">
      {label && (
        <li data-testid="mp-recent-label" dir="auto" className="font-neo-display font-bold uppercase tracking-wider text-[11px] text-neo-white/50">
          {label}
        </li>
      )}
      {recent.map((w, i) => {
        const newest = i === 0;
        return (
          <li
            key={`${w.word}-${w.ts}`}
            data-testid="mp-recent-word"
            data-newest={newest ? 'true' : undefined}
            className={cn(
              // Never wider than the phone: a long word clips.
              'inline-flex items-baseline max-w-full min-w-0 rounded-full border-2 bg-neo-navy-light px-2.5 py-0.5 font-neo-display font-bold uppercase text-sm shadow-hard-sm',
              newest ? 'border-neo-lime text-neo-white' : 'border-neo-black text-neo-white/80',
            )}
          >
            <span dir="auto" className="truncate min-w-0">{w.word}</span>
          </li>
        );
      })}
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
