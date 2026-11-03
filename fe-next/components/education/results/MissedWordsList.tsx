'use client';

import type { ReactNode } from 'react';
import { Target } from 'lucide-react';
import { foundPercent, type MissedWord } from '@/components/education/live/eduReteachModel';

type Translate = (key: string, params?: Record<string, string | number>) => string;

interface MissedWordsListProps {
  words: MissedWord[];
  underHalf: number;
  maxChips?: number;
  /** The localized heading, "Words your class missed". */
  title: string;
  t: Translate;
  /** The action that practices exactly these words, drawn inside the panel so it reads as acting on them. */
  children?: ReactNode;
}

function percentSuffix(w: MissedWord): string {
  const pct = foundPercent(w.found, w.of);
  return pct === null ? '' : ` · ${pct}%`;
}

/** "Words your class missed": the free reteach insight, sized off the results container so the back row can read it. */
export function MissedWordsList({ words, underHalf, maxChips = 8, title, t, children }: MissedWordsListProps) {
  if (words.length === 0) return null;
  const shown = words.slice(0, maxChips);
  const rest = words.length - shown.length;

  return (
    <section
      data-testid="edu-reteach-words"
      aria-labelledby="edu-reteach-words-title"
      className="flex shrink-0 flex-col gap-2.5 rounded-neo border-[3px] border-neo-cream bg-neo-navy-elevated px-3 py-3 shadow-hard @5xl/results:gap-3 @5xl/results:px-4 @5xl/results:py-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2
          id="edu-reteach-words-title"
          className="inline-flex items-center gap-2 font-neo-display text-lg font-black text-neo-cream @5xl/results:text-2xl @[96rem]/results:text-4xl"
        >
          <Target className="size-[1em] shrink-0 text-neo-pink" aria-hidden="true" />
          {title}
        </h2>
        {underHalf > 0 && (
          <p data-testid="edu-needs-help-count" className="font-neo-body text-sm font-bold text-neo-cream @5xl/results:text-base @[96rem]/results:text-xl">
            {t('eduLiveRoom.hostResults.needHelpCount', { count: underHalf })}
          </p>
        )}
      </div>
      <ul className="flex flex-wrap gap-1.5 @5xl/results:gap-2.5">
        {shown.map((w) => (
          <li
            key={w.word}
            data-testid="edu-most-missed-word"
            dir="auto"
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-neo-black bg-neo-cream px-2.5 py-0.5 font-neo-display text-base font-black text-neo-black @5xl/results:px-3 @5xl/results:text-xl @[96rem]/results:px-4 @[96rem]/results:py-1 @[96rem]/results:text-3xl"
          >
            {w.word}
            {w.notOnBoard ? (
              <span className="font-neo-body text-[0.7em] font-bold text-neo-black/75">{t('eduLiveRoom.hostResults.notOnBoard')}</span>
            ) : (
              <span dir="ltr" className="font-neo-body text-[0.7em] font-bold tabular-nums text-neo-black/75">
                {w.found}/{w.of}
                {percentSuffix(w)}
              </span>
            )}
          </li>
        ))}
        {rest > 0 && (
          <li
            data-testid="edu-most-missed-more"
            className="inline-flex items-center rounded-full border-2 border-neo-cream/70 px-2.5 py-0.5 font-neo-body text-sm font-bold text-neo-cream @5xl/results:text-lg @[96rem]/results:text-xl"
          >
            {t('eduLiveRoom.hostResults.moreWords', { count: rest })}
          </li>
        )}
      </ul>
      {children}
    </section>
  );
}

export default MissedWordsList;
