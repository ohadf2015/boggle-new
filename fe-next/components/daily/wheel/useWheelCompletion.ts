import { useCallback, useRef, useState } from 'react';
import type { WordWheelGameResult } from '../WordWheelGame';
import type { WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';
import { saveWordWheelResult, getDailyStreak, updateDailyStreak, getDailyChallengeDate } from '@/utils/dailyChallenge';
import { isSubmittableDate } from '@/utils/dailyChallenge/catchUp';
import { countsTowardWheelStreak, type WordWheelRun } from '@/utils/dailyChallenge/wordWheelRun';
import type { StoredWordWheelResult } from '@/utils/dailyChallenge/types';
import { submitWordWheelDailyResult } from './submitWordWheelDailyResult';
import { shouldPlayFinishBeat } from './WheelTimeUpStamp';
import type { WordWheelPhase } from './useWordWheelLoad';
import type { Language } from '@/types';

interface Profile {
  id: string;
  display_name?: string | null;
  avatar_emoji?: string | null;
  avatar_color?: string | null;
  avatar_image?: string | null;
  country_code?: string | null;
}

interface UseWheelCompletionArgs {
  language: Language;
  isPractice: boolean;
  isCatchup: boolean;
  isAuthenticated: boolean;
  profile: Profile | null | undefined;
  guestFingerprint: string | null;
  setGameActive: (active: boolean) => void;
  setGameResult: (result: WordWheelGameResult | null) => void;
  setPhase: (phase: WordWheelPhase) => void;
  showInterstitial?: (placement: string) => Promise<unknown>;
}

const RESULTS_AD_CAP_MS = 3000;

type PuzzleMeta = Pick<WordWheelPuzzle, 'puzzleDate' | 'puzzleNumber' | 'centerLetter'>;

/** One save-and-submit path for a finished run, a quit, a reload mid-run and a retry of an unsent result. */
export function useWheelCompletion({
  language, isPractice, isCatchup, isAuthenticated, profile, guestFingerprint,
  setGameActive, setGameResult, setPhase, showInterstitial,
}: UseWheelCompletionArgs) {
  const [leaderboardKey, setLeaderboardKey] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const submit = useCallback((result: WordWheelGameResult, meta: PuzzleMeta, streakDays: number) => {
    void submitWordWheelDailyResult({
      result,
      date: meta.puzzleDate,
      puzzleNumber: meta.puzzleNumber,
      language,
      centerLetter: meta.centerLetter,
      isAuthenticated,
      profile,
      guestFingerprint,
      isCatchup,
      streakDays,
      onReconciled: setGameResult,
      onSettled: () => setLeaderboardKey(k => k + 1),
    });
  }, [language, isAuthenticated, profile, guestFingerprint, isCatchup, setGameResult]);

  const persist = useCallback((result: WordWheelGameResult, meta: PuzzleMeta) => {
    const counts = isAuthenticated && countsTowardWheelStreak({ wordCount: result.wordsFound.length, isCatchup });
    const streak = counts ? updateDailyStreak(meta.puzzleDate) : getDailyStreak();
    saveWordWheelResult({
      puzzleNumber: meta.puzzleNumber,
      puzzleDate: meta.puzzleDate,
      language,
      centerLetter: meta.centerLetter,
      wordsFound: result.wordsFound,
      totalPossible: 0,
      score: result.score,
      timeSeconds: result.timeSeconds,
      streakDays: streak.currentStreak,
      completedAt: new Date().toISOString(),
    });
    submit(result, meta, streak.currentStreak);
  }, [isAuthenticated, isCatchup, language, submit]);

  // Same break as Word Hunt: ad between the game and the results, capped so a
  // stalled ad never holds the results. Catch-up days already paid with a rewarded ad.
  // useInterstitialAd fires once per name per mount; practice replays need a fresh name each run.
  const runIndex = useRef(0);
  const revealResults = useCallback(() => {
    if (isCatchup || !showInterstitial) {
      setPhase('completed');
      return;
    }
    let shown = false;
    const showOnce = () => {
      if (shown) return;
      shown = true;
      setPhase('completed');
    };
    const cap = setTimeout(showOnce, RESULTS_AD_CAP_MS);
    showInterstitial(`word-wheel-complete-${runIndex.current++}`).catch(() => {}).finally(() => {
      clearTimeout(cap);
      showOnce();
    });
  }, [isCatchup, showInterstitial, setPhase]);

  const handleComplete = useCallback((result: WordWheelGameResult, meta: PuzzleMeta) => {
    setGameActive(false);
    setGameResult(result);
    if (isPractice) {
      revealResults();
      return;
    }
    persist(result, meta);
    // Results wait for the buzzer beat; the run is already saved above.
    if (shouldPlayFinishBeat(result.timeSeconds)) setFinishing(true);
    else revealResults();
  }, [isPractice, persist, setGameActive, setGameResult, revealResults]);

  /** A run left mid-game (quit or reload) counts with what was found; there is no fresh board. */
  const settleRun = useCallback((run: WordWheelRun, meta: PuzzleMeta): WordWheelGameResult => {
    const result = { wordsFound: run.wordsFound, score: run.score, timeSeconds: 0 };
    persist(result, meta);
    return result;
  }, [persist]);

  const retryUnsent = useCallback((stored: StoredWordWheelResult) => {
    if (!isSubmittableDate(getDailyChallengeDate(), stored.date)) return;
    const r = stored.result;
    submit(
      { wordsFound: r.wordsFound, score: r.score, timeSeconds: r.timeSeconds },
      { puzzleDate: stored.date, puzzleNumber: stored.puzzleNumber, centerLetter: r.centerLetter },
      r.streakDays,
    );
  }, [submit]);

  const finishBeatDone = useCallback(() => {
    setFinishing(false);
    revealResults();
  }, [revealResults]);

  return { handleComplete, settleRun, retryUnsent, finishing, finishBeatDone, leaderboardKey };
}
