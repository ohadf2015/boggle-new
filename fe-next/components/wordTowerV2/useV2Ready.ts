'use client';

import { useEffect, useState } from 'react';
import { useGameEndTelemetry } from '@/hooks/useGameEndTelemetry';
import { useGameStartTelemetry } from '@/hooks/useGameStartTelemetry';
import { getWithAuth } from '@/utils/authFetch';
import { getGuestFingerprint } from '@/utils/guestManager';
import { canUseV2ReviewHooks, v2ReviewHooksFromSearch } from '@/lib/wordTowerV2/reviewHooks';
import { rankFromDailyBoard } from '@/lib/wordTowerV2/daily';
import { shouldConfirmLeave } from '@/lib/wordTowerV2/runPersist';

interface Args {
  daily: boolean;
  isAdmin: boolean;
  canSeeInWorkModes: boolean;
  language: string;
  phase: string;
  floors: number;
  peakM: number;
  score: number;
  resultsShown: boolean;
  seedDemo: (words?: string[]) => void;
  setForceResults: (v: boolean) => void;
  setSmashing: (v: boolean) => void;
}

function fetchDailyBoard(language: string) {
  const params = new URLSearchParams({ language });
  const fp = getGuestFingerprint();
  if (fp) params.set('guestFingerprint', fp);
  return getWithAuth(`/api/word-tower/daily/score?${params.toString()}`).then((r) =>
    r.ok ? r.json() : null,
  );
}

export function useV2Ready({
  daily,
  isAdmin,
  canSeeInWorkModes,
  language,
  phase,
  floors,
  peakM,
  score,
  resultsShown,
  seedDemo,
  setForceResults,
  setSmashing,
}: Args): { dailyRank: number | null; refreshRank: () => void } {
  const [dailyRank, setDailyRank] = useState<number | null>(null);

  useEffect(() => {
    const hooks = v2ReviewHooksFromSearch(
      window.location.search,
      canUseV2ReviewHooks({ canSeeInWorkModes, isAdmin }),
    );
    if (hooks.demo) seedDemo(hooks.words.length ? hooks.words : undefined);
    if (hooks.results) setForceResults(true);
    if (hooks.smash) setSmashing(true);
  }, [canSeeInWorkModes, isAdmin, seedDemo, setForceResults, setSmashing]);

  const [rankTick, setRankTick] = useState(0);
  useEffect(() => {
    if (!daily) return;
    let cancelled = false;
    void fetchDailyBoard(language)
      .then((d) => {
        if (cancelled || !d) return;
        setDailyRank(rankFromDailyBoard(d.leaderboard ?? []));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [daily, language, rankTick]);

  useGameStartTelemetry({
    mode: 'word-tower',
    isGameActive: phase !== 'over',
    extras: { v2: true, daily },
  });
  useGameEndTelemetry({
    mode: 'word-tower',
    resultsShown,
    score,
    wordCount: floors,
    extras: { v2: true, daily, heightM: Math.round(peakM) },
  });

  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => {
      // The daily tower saves itself as it grows: leaving loses nothing.
      if (daily || !shouldConfirmLeave(phase, floors)) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [daily, phase, floors]);

  return { dailyRank, refreshRank: () => setRankTick((n) => n + 1) };
}
