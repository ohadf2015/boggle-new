'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import Link from 'next/link';
import { Pyramid as PyramidIcon, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { dailyPuzzleSet, puzzlesByIds } from '@/lib/connections/daily';
import { fetchDailyLeaderboard, type LeaderboardRow, type SubmitPayload } from '@/lib/connections/dailyClient';
import { patchDailyResult } from '@/lib/connections/dailyResultStore';
import { buildDailyBridgeGrid, gridCallout, type BridgeOutcome } from '@/lib/connections/shareGrid';
import { getPyramidsForLocale } from '@/lib/connections/pyramid/puzzles';
import ProgressCard from './ProgressCard';
import { useBridgeProgress } from './useBridgeProgress';
import RegularDailyResults from './RegularDailyResults';
import ScoreSaveNotice from './ScoreSaveNotice';
import { useDailyScoreSave } from './useDailyScoreSave';

/** Today's finished 5-riddle run, as persisted for a same-day revisit. */
export interface StoredRegularResult {
  kind: 'regular';
  score: number;
  solvedCount: number;
  outcomes: BridgeOutcome[];
  streak: number;
  rank: number | null;
  /** The exact puzzles played — pool growth reseeds the daily, so revisits must not recompute. */
  puzzleIds?: string[];
  /** Set until the server has the score; absent on results stored before retries existed. */
  pendingSubmit?: SubmitPayload | null;
}

export interface DailyBoard {
  loading: boolean;
  rank: number | null;
  totalPlayers: number;
  rows: LeaderboardRow[];
}

export function buildShareText(
  t: (key: string) => string,
  today: string,
  outcomes: BridgeOutcome[],
  streak: number,
  rank: number | null,
): string {
  const url = typeof window !== 'undefined' ? `${window.location.origin}/connections/daily` : undefined;
  return buildDailyBridgeGrid({
    title: t('connections.title'),
    dateISO: today,
    outcomes,
    streak,
    rank,
    callout: t(`connections.daily.shareCallout.${gridCallout(outcomes)}`),
    url,
  });
}

/**
 * Pyramid is the deeper mode — offered as a quiet secondary link under the
 * results. As a full card it competed with NextQuestCta, the one primary
 * "what now" on this screen.
 */
export function PyramidLink() {
  const { t, language } = useLanguage();
  if (getPyramidsForLocale(language).length === 0) return null;
  return (
    <div className="mx-auto w-full max-w-md px-4 pb-6 text-center">
      <Link
        href={`/${language}/connections/pyramid`}
        data-testid="pyramid-cta"
        className="inline-flex items-center gap-1 font-neo-body text-xs font-bold text-neo-purple underline-offset-2 hover:underline"
      >
        <PyramidIcon className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
        {t('connections.pyramid.cta')}
        <DirectionalIcon icon={ChevronRight} className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

export default function RestoredDailyResults({
  result,
  today,
  onTerminal,
}: {
  result: StoredRegularResult & { language: string };
  today: string;
  onTerminal?: () => void;
}) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [puzzles] = useState(
    () => (result.puzzleIds && puzzlesByIds(result.puzzleIds, result.language)) || dailyPuzzleSet(today, result.language),
  );
  const progressApi = useBridgeProgress();
  // Results queued offline before ranks were nullable stored rank 0.
  const storedRank = result.rank && result.rank > 0 ? result.rank : null;
  const [board, setBoard] = useState<DailyBoard>({ loading: true, rank: storedRank, totalPlayers: 0, rows: [] });
  const [boardVersion, setBoardVersion] = useState(0);
  const refreshBoard = useCallback(() => setBoardVersion((v) => v + 1), []);
  const save = useDailyScoreSave(today, (outcome) => {
    if (outcome.status !== 'saved') return;
    patchDailyResult(today, { rank: outcome.result.currentRank, streak: outcome.result.streak });
    refreshBoard();
  });

  useLayoutEffect(() => {
    onTerminal?.();
    // Once per mount — the host only needs the edge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { send } = save;
  useEffect(() => {
    if (result.pendingSubmit) void send(result.pendingSubmit);
    // Once per mount: a score that never reached the server gets one more try.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const lb = await fetchDailyLeaderboard(today, { limit: 50 });
      if (cancelled) return;
      setBoard({
        loading: false,
        rank: lb?.ownRank ?? storedRank,
        totalPlayers: lb?.totalPlayers ?? 0,
        rows: lb?.leaderboard ?? [],
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [today, user, storedRank, boardVersion]);

  return (
    <>
      <RegularDailyResults
        score={result.score}
        solvedCount={result.solvedCount}
        outcomes={result.outcomes}
        puzzles={puzzles}
        dateISO={today}
        celebrate={false}
        shareText={buildShareText(t, today, result.outcomes, result.streak, board.rank)}
        progressSlot={<ProgressCard api={progressApi} todayISO={today} />}
        notice={<ScoreSaveNotice save={save} />}
        board={board}
      />
      <PyramidLink />
    </>
  );
}
