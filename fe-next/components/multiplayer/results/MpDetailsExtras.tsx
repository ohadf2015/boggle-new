'use client';

import { Swords } from 'lucide-react';
import type { BestMissedWord } from '@/components/results/bestMissedWord';
import { WordShowdownPanel, type WordShowdownPanelProps } from './WordShowdownPanel';

type TFn = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  /** Series final only: the live friend challenge. */
  onChallenge?: () => void;
  allPlayerWords: WordShowdownPanelProps['allPlayerWords'];
  username?: string;
  bestMissed: BestMissedWord | null;
  hideOutcome: boolean;
  mode?: string;
  playerCount: number;
  t: TFn;
}

/** What used to crowd the first results screen, now first in "See all words": challenge and the words only I found. */
export function MpDetailsExtras({ onChallenge, allPlayerWords, username, bestMissed, hideOutcome, mode, playerCount, t }: Props) {
  return (
    <div className="flex flex-col gap-3 mb-3">
      {onChallenge && (
        <button
          type="button"
          data-testid="mp-results-challenge"
          onClick={onChallenge}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-neo-pink bg-neo-navy-light px-4 py-3 font-neo-display font-bold uppercase text-neo-pink"
        >
          <Swords aria-hidden="true" className="w-5 h-5" />
          {t('mpUi.results.challenge')}
        </button>
      )}
      {username && (
        <WordShowdownPanel
          allPlayerWords={allPlayerWords}
          username={username}
          bestMissed={bestMissed}
          hideOutcome={hideOutcome}
          mode={mode}
          playerCount={playerCount}
          t={t}
        />
      )}
    </div>
  );
}
