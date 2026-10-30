'use client';

import { useEffect, useMemo, useRef } from 'react';
import UniqueWordsSection from '@/components/results/UniqueWordsSection';
import MissedWords, { type MissedWord } from '@/components/results/MissedWords';
import type { WordObject } from '@/components/results/types';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import { trackGrowthEvent } from '@/utils/growthTracking';
import type { WordLike } from './mpResultsView';

type TFn = (key: string, params?: Record<string, string | number>) => string;

/** Keeps the old deep dive's semantics: results_viewed means DETAILS was opened. */
export function useDetailsViewed(mode: string | undefined, score: number) {
  const first = useRef({ mode, score });
  useEffect(() => {
    trackGrowthEvent('results_viewed', { mode: first.current.mode ?? 'unknown', score: first.current.score });
  }, []);
}

const detailsHeading = 'font-neo-display font-bold uppercase tracking-wider text-neo-cyan text-sm';

interface Props {
  myWords: WordLike[] | null | undefined;
  allPlayerWords: Record<string, WordObject[]>;
  username: string;
  missedWords: MissedWord[];
  language: string;
  t: TFn;
}

export function MpDetailsWords({ myWords, allPlayerWords, username, missedWords, language, t }: Props) {
  const found = useMemo(
    () => (myWords ?? [])
      .filter((w) => w && w.validated && !w.isDuplicate)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.word.length - a.word.length),
    [myWords],
  );
  const show = (word: string) => (language === 'he' ? applyHebrewFinalLetters(word) : word).toUpperCase();
  const multiplayer = Object.keys(allPlayerWords).length > 1;

  return (
    <section data-testid="mp-details-words" className="flex flex-col gap-3">
      <h3 className={detailsHeading}>{t('mpUi.results.detailsWords')}</h3>
      {found.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {found.map((w) => (
            <li
              key={w.word}
              data-testid="mp-details-found-word"
              className="inline-flex items-baseline gap-1 rounded-full border-2 border-neo-black bg-neo-cream px-2.5 py-0.5 text-neo-black font-bold text-sm"
            >
              <span dir="auto" className="font-neo-display tracking-wide">{show(w.word)}</span>
              <span dir="ltr" className="tabular-nums text-xs opacity-70">+{w.score ?? 0}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-neo-body text-sm text-neo-white/70">{t('mpUi.results.detailsNoWords')}</p>
      )}
      {multiplayer && <UniqueWordsSection allPlayerWords={allPlayerWords} currentUsername={username} t={t} />}
      {missedWords.length > 0 && <MissedWords missedWords={missedWords} />}
    </section>
  );
}
