'use client';

import { Target } from 'lucide-react';
import type { MissedWord } from '@/components/education/live/eduReteachModel';

interface MissedWordsListProps {
  words: MissedWord[];
  underHalf: number;
  maxChips?: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/** The words the reteach primary will replay, sized off the results container so the back row can read them. */
export function MissedWordsList({ words, underHalf, maxChips = 8, t }: MissedWordsListProps) {
  if (words.length === 0) return null;
  const shown = words.slice(0, maxChips);
  const rest = words.length - shown.length;

  return (
    <section
      data-testid="edu-missed-words"
      className="flex shrink-0 flex-col gap-2 rounded-neo border-[3px] border-neo-cream bg-neo-navy-elevated px-3 py-3 shadow-hard @5xl/results:gap-3 @5xl/results:px-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="inline-flex items-center gap-2 font-neo-display text-base font-black text-neo-cream @5xl/results:text-xl @[96rem]/results:text-3xl">
          <Target className="size-[1em] shrink-0 text-neo-pink" aria-hidden="true" />
          {t('eduLiveRoom.hostResults.mostMissed')}
        </h2>
        {underHalf > 0 && (
          <p data-testid="edu-needs-help-count" className="font-neo-body text-sm font-bold text-neo-cream/80 @5xl/results:text-base @[96rem]/results:text-xl">
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
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-neo-black bg-neo-cream px-2.5 py-0.5 font-neo-display text-sm font-black text-neo-black @5xl/results:px-3 @5xl/results:text-xl @[96rem]/results:px-4 @[96rem]/results:py-1 @[96rem]/results:text-2xl"
          >
            {w.word}
            {w.notOnBoard ? (
              <span className="font-neo-body text-[0.7em] font-bold text-neo-black/70">{t('eduLiveRoom.hostResults.notOnBoard')}</span>
            ) : (
              <span dir="ltr" className="font-neo-body text-[0.7em] font-bold tabular-nums text-neo-black/70">
                {w.found}/{w.of}
              </span>
            )}
          </li>
        ))}
        {rest > 0 && (
          <li
            data-testid="edu-most-missed-more"
            className="inline-flex items-center rounded-full border-2 border-neo-cream/60 px-2.5 py-0.5 font-neo-body text-sm font-bold text-neo-cream @5xl/results:text-lg @[96rem]/results:text-xl"
          >
            {t('eduLiveRoom.hostResults.moreWords', { count: rest })}
          </li>
        )}
      </ul>
    </section>
  );
}

export default MissedWordsList;
