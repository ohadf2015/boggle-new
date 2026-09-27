'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameEndTelemetry } from '@/hooks/useGameEndTelemetry';
import { useGameStartTelemetry } from '@/hooks/useGameStartTelemetry';
import { getWithAuth, postWithAuth } from '@/utils/authFetch';
import { getGuestFingerprint } from '@/utils/guestManager';
import { canUseV2ReviewHooks, v2ReviewHooksFromSearch } from '@/lib/wordTowerV2/reviewHooks';
import {
  hasPlayedV2DailyToday,
  playedOnDailyBoard,
  rankFromDailyBoard,
  recordV2DailyClimb,
} from '@/lib/wordTowerV2/daily';
import { clearRunSnapshot, loadRunSnapshot, shouldConfirmLeave } from '@/lib/wordTowerV2/runPersist';

interface Args {
  daily: boolean;
  isAdmin: boolean;
  canSeeInWorkModes: boolean;
  language: string;
  phase: string;
  floors: number;
  peakM: number;
  score: number;
  longestWord: string;
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
  longestWord,
  resultsShown,
  seedDemo,
  setForceResults,
  setSmashing,
}: Args): { dailyLocked: boolean; dailyRank: number | null } {
  const [serverPlayed, setServerPlayed] = useState(false);
  const [dailyRank, setDailyRank] = useState<number | null>(null);
  const dailyLocked = daily && (hasPlayedV2DailyToday() || serverPlayed);

  useEffect(() => {
    const hooks = v2ReviewHooksFromSearch(
      window.location.search,
      canUseV2ReviewHooks({ canSeeInWorkModes, isAdmin }),
    );
    if (hooks.demo) seedDemo(hooks.words.length ? hooks.words : undefined);
    if (hooks.results) setForceResults(true);
    if (hooks.smash) setSmashing(true);
  }, [canSeeInWorkModes, isAdmin, seedDemo, setForceResults, setSmashing]);

  useEffect(() => {
    if (!daily) return;
    let cancelled = false;
    void fetchDailyBoard(language)
      .then((d) => {
        if (cancelled || !d) return;
        const rows = d.leaderboard ?? [];
        if (playedOnDailyBoard(rows)) setServerPlayed(true);
        setDailyRank(rankFromDailyBoard(rows));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [daily, language]);

  useEffect(() => {
    if (!daily) return;
    if (dailyLocked) {
      setForceResults(true);
      return;
    }
    const snap = loadRunSnapshot(true, window.sessionStorage);
    if (snap && snap.words.length > 0) seedDemo(snap.words);
  }, [daily, dailyLocked, seedDemo, setForceResults]);

  useGameStartTelemetry({
    mode: 'word-tower',
    isGameActive: phase !== 'over' && !dailyLocked,
    extras: { v2: true, daily },
  });
  useGameEndTelemetry({
    mode: 'word-tower',
    resultsShown,
    score,
    wordCount: floors,
    extras: { v2: true, daily, heightM: Math.round(peakM) },
  });

  const submitted = useRef(false);
  useEffect(() => {
    if (!daily || !resultsShown || submitted.current) return;
    submitted.current = true;
    const body = recordV2DailyClimb(
      { climbM: peakM, floors, longestWord },
      { language, guestFingerprint: getGuestFingerprint(), storage: window.localStorage },
    );
    clearRunSnapshot(true, window.sessionStorage);
    if (!body) return;
    void postWithAuth('/api/word-tower/daily/score', body)
      .then(() => fetchDailyBoard(language))
      .then((d) => {
        if (!d) return;
        setDailyRank(rankFromDailyBoard(d.leaderboard ?? []));
      })
      .catch(() => undefined);
  }, [daily, resultsShown, peakM, floors, longestWord, language]);

  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => {
      if (!shouldConfirmLeave(phase, floors)) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [phase, floors]);

  return { dailyLocked, dailyRank };
}
