'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Fingerprint } from 'lucide-react';
import { cn } from '@/lib/utils';
import { selectUniqueWords } from '@/lib/results/selectUniqueWords';
import {
  heroUniqueWords,
  shouldShowWordShowdown,
  WORD_SHOWDOWN_UNIQUE_CAP,
} from '@/lib/results/shouldShowWordShowdown';
import type { BestMissedWord } from '@/components/results/bestMissedWord';
import type { WordObject } from '@/components/results/types';
import { trackGrowthEvent } from '@/utils/growthTracking';

type TFn = (key: string, params?: Record<string, string | number>) => string;

export interface WordShowdownPanelProps {
  allPlayerWords: Record<string, WordObject[]>;
  username: string;
  /** Used for analytics + visibility helper; best-missed line stays on MpMyCard. */
  bestMissed: BestMissedWord | null;
  hideOutcome?: boolean;
  mode?: string;
  playerCount?: number;
  className?: string;
  t: TFn;
}

/**
 * Hero Word Showdown — unique-word chips on the main results stage.
 * Best-missed stays on MpMyCard (already fires best_missed_word_shown) to avoid
 * duplicating the same line in one viewport. Details keeps the full unique list.
 */
export function WordShowdownPanel({
  allPlayerWords,
  username,
  bestMissed,
  hideOutcome = false,
  mode = 'multiplayer',
  playerCount = 0,
  className,
  t,
}: WordShowdownPanelProps) {
  const uniques = useMemo(
    () => (username ? selectUniqueWords(allPlayerWords, username) : []),
    [allPlayerWords, username],
  );
  const chips = useMemo(() => heroUniqueWords(uniques, WORD_SHOWDOWN_UNIQUE_CAP), [uniques]);
  const show = shouldShowWordShowdown({
    uniqueCount: chips.length,
    hasBestMissed: false, // best-missed already on MpMyCard; panel is unique-chips only
    hideOutcome,
  });

  // Scores can re-render as late standings arrive — fire the impression once
  // per mounted match identity (mode+playerCount+username), not on every chip update.
  const impressedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!show) return;
    const key = `${mode}|${playerCount}|${username}`;
    if (impressedKeyRef.current === key) return;
    impressedKeyRef.current = key;
    trackGrowthEvent('word_showdown_shown', {
      uniqueCount: chips.length,
      hasBestMissed: !!bestMissed,
      mode,
      playerCount,
    });
  }, [show, chips.length, bestMissed, mode, playerCount, username]);

  if (!show) return null;

  return (
    <section
      data-testid="mp-word-showdown"
      aria-label={t('mpUi.results.showdownTitle')}
      className={cn(
        'rounded-neo border-[3px] border-neo-cyan/50 bg-neo-navy/70 p-[calc(10px*var(--mp-u,1))] shadow-hard-sm',
        className,
      )}
    >
      <div className="space-y-[calc(6px*var(--mp-u,1))]">
        <div className="flex items-center gap-2">
          <Fingerprint aria-hidden="true" className="w-4 h-4 text-neo-cyan shrink-0" />
          <h3 className="text-[calc(12px*var(--mp-u,1))] font-neo-display font-black uppercase tracking-wide text-neo-white">
            {t('mpUi.results.showdownOnlyYou')}
          </h3>
          <span className="ms-auto text-[calc(11px*var(--mp-u,1))] font-bold text-neo-cyan tabular-nums">
            {uniques.length}
          </span>
        </div>
        <ul className="flex flex-wrap gap-1.5" dir="auto">
          {chips.map((word) => (
            <li
              key={word}
              data-testid="mp-showdown-unique-chip"
              className="inline-flex items-center rounded-neo border-2 border-neo-cyan/60 bg-neo-cyan/15 px-2 py-0.5 font-neo-body font-bold uppercase text-[calc(11px*var(--mp-u,1))] text-neo-cyan"
            >
              {word}
            </li>
          ))}
          {uniques.length > chips.length && (
            <li className="inline-flex items-center px-1 text-[calc(11px*var(--mp-u,1))] font-bold text-neo-cream/70">
              {t('mpUi.results.showdownMore', { count: uniques.length - chips.length })}
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}

export default WordShowdownPanel;
