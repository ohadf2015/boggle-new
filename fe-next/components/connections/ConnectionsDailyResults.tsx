'use client';

import type { ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DailyResultsHero, type DailyResultsStat } from '@/components/daily/results/DailyResultsHero';
import { NextQuestCta } from '@/components/daily/results/NextQuestCta';
import ResultsBannerSlot from '@/components/ads/ResultsBannerSlot';
import type { LeaderboardRow } from '@/lib/connections/dailyClient';
import type { ConnectionPuzzle } from '@/lib/connections/types';
import BridgeCountdown from './BridgeCountdown';
import BridgeShareRow from './BridgeShareRow';
import DailyAnswerKey from './DailyAnswerKey';
import ConnectionsLeaderboard from './ConnectionsLeaderboard';

export interface ConnectionsDailyResultsProps {
  outcome: 'win' | 'loss' | 'done';
  headline: string;
  eyebrow?: ReactNode;
  score: number;
  stats: DailyResultsStat[];
  /** Outcome strip inside the hero: the chain tiles, or the finished pyramid. */
  meter: ReactNode;
  /** Fresh finish only — a same-day revisit opens quietly. */
  celebrate: boolean;
  shareText: string;
  onShareClick?: (method: 'native' | 'copy') => void;
  /** Flavor-specific note right under the hero (zero-solved encouragement, pyramid reveal). */
  body?: ReactNode;
  /** Score-save problems, right under the hero. */
  notice?: ReactNode;
  /** Lifetime rank + week strip. */
  progressSlot?: ReactNode;
  answerKey: { puzzles: readonly ConnectionPuzzle[]; solvedIndices: ReadonlySet<number> };
  ctaSource: string;
  /** The 5-riddle chain has a shared board; the pyramid does not. */
  leaderboard?: { rows: LeaderboardRow[]; rank: number | null; totalPlayers: number; loading: boolean };
}

/**
 * Both Word Bridge daily flavors end here, so the chain and the pyramid read
 * as the same daily quest: shared hero, then what's next, then the details.
 */
export default function ConnectionsDailyResults({
  outcome,
  headline,
  eyebrow,
  score,
  stats,
  meter,
  celebrate,
  shareText,
  onShareClick,
  body,
  notice,
  progressSlot,
  answerKey,
  ctaSource,
  leaderboard,
}: ConnectionsDailyResultsProps) {
  const { t, language } = useLanguage();

  return (
    <div data-testid="connections-daily-results" className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-6 pt-2">
      <DailyResultsHero
        mode="connections"
        outcome={outcome}
        headline={headline}
        eyebrow={eyebrow}
        score={score}
        scoreLabel={t('connections.score')}
        stats={stats}
        meter={meter}
        celebrate={celebrate}
      >
        <BridgeShareRow shareText={shareText} onShareClick={onShareClick} />
      </DailyResultsHero>

      {notice}
      {body}

      <NextQuestCta justFinished="connections" currentLanguage={language} source={ctaSource} />
      <div data-testid="bridge-countdown" className="-mt-2 text-center">
        <BridgeCountdown nextLabel={t('connections.daily.nextIn')} />
      </div>

      {progressSlot}

      <DailyAnswerKey
        puzzles={answerKey.puzzles}
        solvedIndices={answerKey.solvedIndices}
        title={t('connections.daily.answerKey')}
        isRTL={language === 'he'}
      />

      <ResultsBannerSlot placement="daily-complete" />

      {leaderboard && (
        <div data-testid="connections-leaderboard">
          <ConnectionsLeaderboard
            rows={leaderboard.rows}
            ownRank={leaderboard.rank}
            totalPlayers={leaderboard.totalPlayers}
            loading={leaderboard.loading}
          />
        </div>
      )}
    </div>
  );
}
