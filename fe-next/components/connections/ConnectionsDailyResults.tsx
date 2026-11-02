'use client';

import type { ReactNode } from 'react';
import { m } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { DailyResultsFrame } from '@/components/daily/results/DailyResultsFrame';
import { DailyRevealProvider, useDailyReveal } from '@/components/daily/results/reveal/DailyRevealContext';
import { REVEAL } from '@/components/daily/results/reveal/revealSequence';
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

/** The outcome strip is laid across like a bridge deck, from the start edge, on the stamp beat. */
function BridgeLay({ children }: { children: ReactNode }) {
  const reveal = useDailyReveal();
  if (!reveal.active) return <>{children}</>;
  const laid = reveal.stage >= REVEAL.stamp;
  return (
    <m.div
      className="ltr:origin-left rtl:origin-right"
      initial={{ scaleX: 0 }}
      animate={{ scaleX: laid ? 1 : 0 }}
      transition={reveal.skipped ? { duration: 0 } : { type: 'spring', stiffness: 220, damping: 22 }}
    >
      {children}
    </m.div>
  );
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

  const aside = (
    <>
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
    </>
  );

  return (
    <DailyRevealProvider celebrate={celebrate}>
      <DailyResultsFrame testId="connections-daily-results" className="pb-6 pt-2" aside={aside}>
        <DailyResultsHero
          mode="connections"
          outcome={outcome}
          headline={headline}
          eyebrow={eyebrow}
          score={score}
          scoreLabel={t('connections.score')}
          stats={stats}
          meter={<BridgeLay>{meter}</BridgeLay>}
          celebrate={celebrate}
        >
          <BridgeShareRow shareText={shareText} onShareClick={onShareClick} />
        </DailyResultsHero>

        {notice}
        {body}
      </DailyResultsFrame>
    </DailyRevealProvider>
  );
}
