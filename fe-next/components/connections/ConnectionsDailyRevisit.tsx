'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { dailyPuzzleSet } from '@/lib/connections/daily';
import { fetchDailyLeaderboard, getGuestFingerprint, type LeaderboardRow } from '@/lib/connections/dailyClient';
import { updateDailySnapshot, type DailyBridgeSnapshot } from '@/lib/connections/dailySnapshot';
import { buildDailyBridgeGrid, gridCallout } from '@/lib/connections/shareGrid';
import { trackDailyShared } from '@/lib/connections/dailyTelemetry';
import ConnectionsDailyResults from './ConnectionsDailyResults';
import DailyPyramidCta from './DailyPyramidCta';

/**
 * Today's Word Bridge daily, already finished on this device: the stored run
 * comes back as its results screen (share, answer key, next quest) with a
 * fresh leaderboard — never a second playable board, never a second submit.
 */
export default function ConnectionsDailyRevisit({ snapshot }: { snapshot: DailyBridgeSnapshot }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [board, setBoard] = useState<{
    loading: boolean;
    rows: LeaderboardRow[];
    rank: number | null;
    totalPlayers: number;
  }>({ loading: true, rows: [], rank: snapshot.rank, totalPlayers: 0 });

  // The run's own puzzles, rebuilt from the locale it was played in.
  const puzzles = useMemo(
    () => dailyPuzzleSet(snapshot.dateISO, snapshot.language),
    [snapshot.dateISO, snapshot.language],
  );

  useEffect(() => {
    let live = true;
    const guestFingerprint = user ? undefined : getGuestFingerprint();
    void fetchDailyLeaderboard(snapshot.dateISO, { guestFingerprint, limit: 50 }).then((lb) => {
      if (!live) return;
      const rank = lb?.ownRank ?? snapshot.rank;
      setBoard({ loading: false, rows: lb?.leaderboard ?? [], rank, totalPlayers: lb?.totalPlayers ?? 0 });
      if (rank !== snapshot.rank) updateDailySnapshot(snapshot.dateISO, { rank });
    });
    return () => {
      live = false;
    };
  }, [snapshot.dateISO, snapshot.rank, user]);

  const shareText = useMemo(() => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/connections/daily` : undefined;
    return buildDailyBridgeGrid({
      title: t('connections.title'),
      dateISO: snapshot.dateISO,
      outcomes: snapshot.outcomes,
      streak: snapshot.streak,
      rank: board.rank,
      callout: t(`connections.daily.shareCallout.${gridCallout(snapshot.outcomes)}`),
      url,
    });
  }, [t, snapshot, board.rank]);

  const handleShareClick = useCallback(() => {
    trackDailyShared({
      locale: snapshot.language,
      solved: snapshot.solvedCount,
      total: snapshot.total,
    });
  }, [snapshot.language, snapshot.solvedCount, snapshot.total]);

  return (
    <>
      <ConnectionsDailyResults
        revisit
        score={snapshot.score}
        solvedCount={snapshot.solvedCount}
        total={snapshot.total}
        streak={snapshot.streak}
        rank={board.rank}
        totalPlayers={board.totalPlayers}
        outcomes={snapshot.outcomes}
        puzzles={puzzles}
        leaderboardRows={board.rows}
        isLoading={board.loading}
        shareText={shareText}
        dateISO={snapshot.dateISO}
        onShareClick={handleShareClick}
      />
      <DailyPyramidCta />
    </>
  );
}
