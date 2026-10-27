'use client';

import type { ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { LeaderboardRow } from '@/lib/connections/dailyClient';
import type { BridgeOutcome } from '@/lib/connections/shareGrid';
import type { ConnectionPuzzle } from '@/lib/connections/types';
import BridgeOutcomeTiles from './BridgeOutcomeTiles';
import ConnectionsDailyResults from './ConnectionsDailyResults';

interface RegularDailyResultsProps {
  score: number;
  solvedCount: number;
  outcomes: readonly BridgeOutcome[];
  puzzles: readonly ConnectionPuzzle[];
  dateISO: string;
  celebrate: boolean;
  shareText: string;
  onShareClick?: (method: 'native' | 'copy') => void;
  progressSlot?: ReactNode;
  board: { rows: LeaderboardRow[]; rank: number | null; totalPlayers: number; loading: boolean };
}

export function regularTier(score: number, solvedCount: number, total: number): { key: string; outcome: 'win' | 'loss' | 'done' } {
  if (solvedCount === 0) return { key: 'connections.daily.completeTough', outcome: 'loss' };
  if (solvedCount === total && score >= 400) return { key: 'connections.daily.tier.perfect', outcome: 'win' };
  if (score >= 300 || solvedCount >= total - 1) return { key: 'connections.daily.tier.exceptional', outcome: 'win' };
  if (score >= 150 || solvedCount >= Math.ceil(total * 0.6)) return { key: 'connections.daily.tier.great', outcome: 'done' };
  return { key: 'connections.daily.tier.good', outcome: 'done' };
}

export function totalMisses(outcomes: readonly BridgeOutcome[]): number {
  return outcomes.reduce((sum, o) => sum + o.wrongAttempts, 0);
}

function shortDate(dateISO: string, language: string): string {
  try {
    return new Intl.DateTimeFormat(language, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${dateISO}T00:00:00Z`));
  } catch {
    return dateISO;
  }
}

/** The 5-riddle chain's end screen, in the shared Word Bridge results layout. */
export default function RegularDailyResults({
  score,
  solvedCount,
  outcomes,
  puzzles,
  dateISO,
  celebrate,
  shareText,
  onShareClick,
  progressSlot,
  board,
}: RegularDailyResultsProps) {
  const { t, language } = useLanguage();
  const total = puzzles.length;
  const tier = regularTier(score, solvedCount, total);
  const solvedIndices = new Set(outcomes.flatMap((o, i) => (o.solved ? [i] : [])));

  return (
    <ConnectionsDailyResults
      outcome={tier.outcome}
      headline={t(tier.key)}
      eyebrow={shortDate(dateISO, language)}
      score={score}
      stats={[
        { value: `${solvedCount}/${total}`, label: t('connections.daily.solvedLabel') },
        { value: totalMisses(outcomes), label: t('connections.daily.missesLabel') },
        { value: board.rank != null ? `#${board.rank}` : '–', label: t('share.emojiCard.rank') },
      ]}
      meter={<BridgeOutcomeTiles outcomes={outcomes} />}
      celebrate={celebrate}
      shareText={shareText}
      onShareClick={onShareClick}
      body={
        solvedCount === 0 ? (
          <p className="rounded-neo border-2 border-neo-cyan bg-neo-cyan/10 px-4 py-3 text-center font-neo-body text-sm text-neo-white/80">
            {t('connections.daily.zeroSolved', { total })}
          </p>
        ) : undefined
      }
      progressSlot={progressSlot}
      answerKey={{ puzzles, solvedIndices }}
      ctaSource={solvedCount === 0 ? 'connections_daily_results_blanked' : 'connections_daily_results'}
      leaderboard={board}
    />
  );
}
