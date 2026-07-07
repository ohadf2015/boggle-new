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
  isClient: boolean;
  /**
   * True until today's win/loss outcome is *known* — i.e. an authed player's
   * server snapshot is still in flight and no local completion exists yet.
   * Consumers must render the pessimistic/skeleton state while this is true
   * instead of the optimistic "not played → Play" default, which would flip to
   * "View results" once the snapshot lands (the CTA-flicker bug, pitfall Class 1).
   */
  loading: boolean;
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
  const [isClient, setIsClient] = useState(false);
  // Outcome-resolution flag. Seeds pessimistically to `true` so SSR + the first
  // client frame both paint the not-yet-known state; the mount effect flips it to
  // `false` the moment the outcome is known (local completion, resolved server
  // snapshot, or a guest with no server fetch pending).
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setIsClient(true);
    const date = getDailyChallengeDate();

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
      setLoading(false);
      return;
    }

    if (preloadedStats && !preloadedStats.loading) {
      setHasPlayed(preloadedStats.hasPlayed);
      setHasSolved(preloadedStats.hasSolved ?? false);
      setStreak(preloadedStats.currentStreak);
      setPuzzleNumber(preloadedStats.puzzleNumber || getPuzzleNumber(date));
      setLoading(false);
      return;
    }

    setPuzzleNumber(getPuzzleNumber(date));
    setHasPlayed(false);
    setHasSolved(false);
    setStreak(getDailyStreak().currentStreak);
    // Keep loading=true ONLY while an authed server snapshot is genuinely still
    // in flight (`preloadedStats.loading`). With no preloaded feed at all,
    // localStorage is the sole source of truth and it has already resolved here,
    // so the outcome is known — don't strand consumers in a skeleton forever.
    setLoading(preloadedStats?.loading ?? false);
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
      // A focus/visibility refresh reads the freshest local truth synchronously —
      // the outcome is known, so clear any lingering loading state.
      setLoading(false);
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

  return { countdown, hasPlayed, hasSolved, streak, puzzleNumber, isClient, loading };
}

export default useDailyChallengeStats;
