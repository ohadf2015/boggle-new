'use client';

import type { ReactNode } from 'react';
import { Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NB_PANEL } from '@/components/teacher/nb/nbStyles';
import type { MissedWord } from '@/components/education/live/eduReteachModel';

type Translate = (key: string, params?: Record<string, string | number>) => string;

interface MissedWordsListProps {
  words: MissedWord[];
  maxChips?: number;
  /** The localized heading, "Words your class missed". */
  title: string;
  t: Translate;
  /** The action that practices exactly these words, drawn inside the panel so it reads as acting on them. */
  children?: ReactNode;
}

/** "Words your class missed": the free reteach insight, sized off the results container so the back row can read it. */
export function MissedWordsList({ words, maxChips = 8, title, t, children }: MissedWordsListProps) {
  if (words.length === 0) return null;
  const shown = words.slice(0, maxChips);
  const rest = words.length - shown.length;

  return (
    <section
      data-testid="edu-reteach-words"
      aria-labelledby="edu-reteach-words-title"
      className={cn(NB_PANEL, 'flex shrink-0 flex-col gap-2.5 px-3 py-3 @5xl/results:gap-3 @5xl/results:px-4 @5xl/results:py-4')}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2
          id="edu-reteach-words-title"
          className="inline-flex items-center gap-2 font-neo-display text-lg font-black text-neo-cream @5xl/results:text-2xl @[96rem]/results:text-4xl"
        >
          <Target className="size-[1em] shrink-0 text-neo-pink" aria-hidden="true" />
          {title}
        </h2>
      </div>
      <ul className="flex flex-wrap gap-1.5 @5xl/results:gap-2.5">
        {shown.map((w) => (
          <li
            key={w.word}
            data-testid="edu-most-missed-word"
            dir="auto"
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-neo-black bg-neo-cream shadow-hard-sm px-2.5 py-0.5 font-neo-display text-base font-black text-neo-black @5xl/results:px-3 @5xl/results:text-xl @[96rem]/results:px-4 @[96rem]/results:py-1 @[96rem]/results:text-3xl"
          >
            {w.word}
            {w.notOnBoard ? (
              <span className="font-neo-body text-[0.7em] font-bold text-neo-black/75">{t('eduLiveRoom.hostResults.notOnBoard')}</span>
            ) : w.found > 0 ? (
              <span dir="ltr" className="font-neo-body text-[0.7em] font-bold tabular-nums text-neo-black/75">
                {w.found}/{w.of}
              </span>
            ) : null}
          </li>
        ))}
        {rest > 0 && (
          <li
            data-testid="edu-most-missed-more"
            className="inline-flex items-center rounded-full border-2 border-dashed border-neo-cream/70 px-2.5 py-0.5 font-neo-body text-sm font-bold text-neo-cream @5xl/results:text-lg @[96rem]/results:text-xl"
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
