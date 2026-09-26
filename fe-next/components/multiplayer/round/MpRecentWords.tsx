'use client';

import { Fragment, memo } from 'react';
import { useShouldReduceMotion } from '@/contexts/AccessibilityContext';
import { cn } from '@/lib/utils';
import styles from './round.module.css';
import type { LadderWord } from '../desktop/WordsLadder';

/** Chips the phone trail shows; older words fold into one "+N" chip (at most ~3 rows on a 390px phone). */
export const MAX_RECENT_WORDS = 12;

/**
 * Phone only: my words in the free stage above the board — the desktop
 * ladder's job on a screen with no room for a ladder. The newest word STAMPS in
 * big on its own row (transform-only punch; still under reduced motion), older
 * ones trail as small chips. Newest first, the SERVER's points. Before the
 * first word the stage carries the mode's one-line rule, quietly.
 */
function MpRecentWordsImpl({ words, emptyHint }: { words: LadderWord[]; emptyHint?: string }) {
  const reduceMotion = useShouldReduceMotion();
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
      {recent.map((w, i) => {
        const hero = i === 0;
        return (
          <Fragment key={`${w.word}-${w.ts}`}>
            <li
              data-testid="mp-recent-word"
              data-hero={hero ? 'true' : undefined}
              className={cn(
                'inline-flex items-baseline border-neo-black font-neo-display font-bold uppercase',
                hero
                  ? cn('gap-2 rounded-neo border-3 bg-neo-lime px-4 py-1 text-3xl text-neo-black shadow-hard -rotate-2 mb-1', !reduceMotion && styles.wordStamp)
                  : 'gap-1 rounded-full border-2 bg-neo-navy-light px-2.5 py-0.5 text-sm text-neo-white/80 shadow-hard-sm',
              )}
            >
              <span dir="auto">{w.word}</span>
              {w.score > 0 && (
                <span
                  data-testid="mp-recent-word-points"
                  dir="ltr"
                  className={cn('tabular-nums', hero ? 'text-lg' : 'text-xs opacity-80')}
                >
                  +{w.score}
                </span>
              )}
            </li>
            {hero && <li data-testid="mp-recent-break" aria-hidden="true" className="basis-full h-0" />}
          </Fragment>
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
