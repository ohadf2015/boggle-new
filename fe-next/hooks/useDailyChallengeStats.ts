'use client';

import { useState, useEffect } from 'react';
import { useInterval } from '@/hooks/useSafeTimeout';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getDailyChallengeDate,
  getPuzzleNumber,
  getSecondsUntilNextDaily,
  formatCountdown,
  getWordHuntStatusToday,
  getDailyStreak,
  getAllWordHuntResults,
} from '@/utils/dailyChallenge';
import type { Language } from '@/types';

export interface PreloadedDailyStats {
  hasPlayed: boolean;
  hasSolved: boolean | null;
  currentStreak: number;
  puzzleNumber?: number;
  loading?: boolean;
}

export interface DailyChallengeStats {
  countdown: string;
  hasPlayed: boolean;
  hasSolved: boolean;
  streak: number;
  puzzleNumber: number;
  /** ISO dates (YYYY-MM-DD) the player completed the daily — powers the week tracker. */
  playedDates: string[];
  isClient: boolean;
}

/**
 * Live daily-challenge state — puzzle #, ticking countdown, streak, and today's
 * win/loss outcome. Extracted from DailyChallengeBanner so multiple daily heroes
 * (the legacy banner and the new bento cube) share one source of truth instead of
 * each re-implementing the preloaded-stats merge + 1s countdown + tab-refresh.
 *
 * SSR-safe: countdown seeds to placeholders on the server and resolves on the
 * client; `isClient` lets callers gate hydration-sensitive UI.
 */
export function useDailyChallengeStats(preloadedStats?: PreloadedDailyStats): DailyChallengeStats {
  const { language } = useLanguage();
  const [countdown, setCountdown] = useState<string>(() => {
    if (typeof window === 'undefined') return '--:--:--';
    return formatCountdown(getSecondsUntilNextDaily());
  });
  const [hasPlayed, setHasPlayed] = useState<boolean>(preloadedStats?.hasPlayed ?? false);
  const [hasSolved, setHasSolved] = useState<boolean>(preloadedStats?.hasSolved ?? false);
  const [streak, setStreak] = useState<number>(preloadedStats?.currentStreak ?? 0);
  const [puzzleNumber, setPuzzleNumber] = useState<number>(preloadedStats?.puzzleNumber ?? 0);
  const [playedDates, setPlayedDates] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const date = getDailyChallengeDate();
    // Completion history (per-day) for the home week tracker. localStorage-only,
    // so it's read on the client after mount alongside the other daily state.
    setPlayedDates(getAllWordHuntResults(language as Language).map((r) => r.date));

    // Freshest local truth first. When the player finishes today's daily,
    // saveWordHuntResult writes localStorage synchronously. If they then return
    // home via client-side routing the tab never loses visibility, so the
    // focus/visibility refresh below never fires — the preloaded server snapshot
    // (fetched at page load, before they played) would otherwise pin the cube to
    // a stale "not played" state until a hard refresh. Reading localStorage on
    // mount makes the homepage outcome badge update immediately.
    const localStatus = getWordHuntStatusToday(language as Language);
    if (localStatus) {
      setHasPlayed(true);
      setHasSolved(localStatus.solved);
      setStreak(getDailyStreak().currentStreak);
      setPuzzleNumber(preloadedStats?.puzzleNumber || getPuzzleNumber(date));
      return;
    }

    if (preloadedStats && !preloadedStats.loading) {
      setHasPlayed(preloadedStats.hasPlayed);
      setHasSolved(preloadedStats.hasSolved ?? false);
      setStreak(preloadedStats.currentStreak);
      setPuzzleNumber(preloadedStats.puzzleNumber || getPuzzleNumber(date));
      return;
    }

    setPuzzleNumber(getPuzzleNumber(date));
    setHasPlayed(false);
    setHasSolved(false);
    setStreak(getDailyStreak().currentStreak);
  }, [language, preloadedStats]);

  // Refresh outcome when the tab regains focus (player may have just finished a
  // daily in another tab / mid-session) — only once we're client-side.
  useEffect(() => {
    if (!isClient) return;
    const refresh = () => {
      const status = getWordHuntStatusToday(language as Language);
      setHasPlayed(!!status);
      setHasSolved(status?.solved ?? false);
      setStreak(getDailyStreak().currentStreak);
      setPlayedDates(getAllWordHuntResults(language as Language).map((r) => r.date));
    };
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refresh);
    };
  }, [isClient, language]);

  useInterval(
    () => {
      if (document.visibilityState === 'hidden') return;
      setCountdown(formatCountdown(getSecondsUntilNextDaily()));
    },
    isClient ? 1000 : null,
  );

  return { countdown, hasPlayed, hasSolved, streak, puzzleNumber, playedDates, isClient };
}

export default useDailyChallengeStats;
