'use client';

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { WordWheelGameResult } from '../WordWheelGame';
import {
  generateWordWheelPuzzle,
  type WordWheelPuzzle,
} from '@/utils/dailyChallenge/wordWheelGeneration';
import {
  getDailyChallengeDate,
  getPuzzleNumber,
  hasPlayedWordWheelToday,
  getTodaysWordWheelResult,
  saveWordWheelResult,
  getDailyStreak,
  hasPlayedWordWheel,
  getWordWheelResultForDate,
  hasEverPlayedWordWheel,
} from '@/utils/dailyChallenge';
import { getGuestFingerprint } from '@/utils/dailyChallenge/guestPlayer';
import { prewarmDictionary } from '@/hooks/useDictionaryCache';
import { wordWheelBridgeSkipsReady } from '@/lib/retention/firstGameBridge';
import type { Language } from '@/types';

export type WordWheelPhase = 'loading' | 'ready' | 'playing' | 'completed' | 'already-played';

export const ENTRY_WARMUP_CAP_MS = 1500;

export function settleWithin(tasks: Promise<unknown>[], capMs: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cap = new Promise<void>((resolve) => { timer = setTimeout(resolve, capMs); });
  return Promise.race([Promise.allSettled(tasks).then(() => undefined), cap])
    .finally(() => clearTimeout(timer));
}

interface CheckPlayedResponse {
  hasPlayed: boolean;
  result?: {
    score: number;
    wordsFound: string[];
    longestWord: string | null;
    timeSeconds: number;
    centerLetter: string | null;
    completedAt: string | null;
  };
}

interface UseWordWheelLoadOptions {
  language: Language;
  isPractice: boolean;
  catchupDate: string | null;
  isAuthenticated: boolean;
  authLoading?: boolean;
  playerId: string | undefined;
  guestFingerprint: string | null;
  setGameActive: (active: boolean) => void;
  catchupAdUnlockedRef: MutableRefObject<boolean>;
  /** Extra chunks to load while the loader is still up (e.g. the effects canvas). */
  preloadForPlay?: () => Promise<unknown>;
  /** `?start=1` from the first-game bridge: skip the ready card and the how-to. */
  autoStart?: boolean;
}

export function useWordWheelLoad({
  language, isPractice, catchupDate, isAuthenticated, authLoading, playerId, guestFingerprint,
  setGameActive, catchupAdUnlockedRef, preloadForPlay, autoStart = false,
}: UseWordWheelLoadOptions) {
  const isCatchup = !!catchupDate;
  const [phase, setPhase] = useState<WordWheelPhase>('loading');
  const [puzzle, setPuzzle] = useState<WordWheelPuzzle | null>(null);
  const [gameResult, setGameResult] = useState<WordWheelGameResult | null>(null);
  const [puzzleNumber, setPuzzleNumber] = useState(0);

  const loadKey = `${catchupDate || getDailyChallengeDate()}|${language}|${isPractice}`;
  // A late profile re-runs init: it may still find a cross-device result, but must never rebuild an entered board.
  const enteredKeyRef = useRef<string | null>(null);

  const enterPlaying = useCallback(() => {
    enteredKeyRef.current = loadKey;
    setGameActive(true);
    setPhase('playing');
  }, [loadKey, setGameActive]);

  useEffect(() => {
    if (authLoading) return;
    // Read live: the player can tap Play while this run awaits the server check.
    const entered = () => enteredKeyRef.current === loadKey;
    let isMounted = true;
    const date = catchupDate || getDailyChallengeDate();
    const number = getPuzzleNumber(date);
    setPuzzleNumber(number);
    catchupAdUnlockedRef.current = false;

    const init = async () => {
      if (isPractice) {
        if (entered()) return;
        // A random wheel: seeding by date would hand out today's daily untimed.
        const generated = generateWordWheelPuzzle(`practice-${Math.random().toString(36).slice(2)}`, language);
        if (!isMounted) return;
        setPuzzle(generated);
        setPhase('ready');
        return;
      }

      const hasPlayed = isCatchup
        ? hasPlayedWordWheel(language, date)
        : hasPlayedWordWheelToday(language);

      if (hasPlayed) {
        const stored = isCatchup
          ? getWordWheelResultForDate(language, date)
          : getTodaysWordWheelResult(language);
        if (!isMounted) return;
        setGameResult(stored
          ? { wordsFound: stored.result.wordsFound, score: stored.result.score, timeSeconds: stored.result.timeSeconds }
          : { wordsFound: [], score: 0, timeSeconds: 0 });
        setPhase('already-played');
        return;
      }

      // Cross-device sync: the canonical record lives server-side.
      try {
        const params = new URLSearchParams();
        if (isAuthenticated && playerId) params.set('playerId', playerId);
        else {
          const fp = guestFingerprint ?? (await getGuestFingerprint());
          if (fp) params.set('guestFingerprint', fp);
        }

        if (params.toString()) {
          const resp = await fetch(
            `/api/daily-challenge/word-wheel/check-played/${date}/${language}?${params.toString()}`,
            { signal: AbortSignal.timeout(5000) },
          );
          if (!isMounted) return;
          if (resp.ok) {
            const data = (await resp.json()) as CheckPlayedResponse;
            if (data.hasPlayed && data.result) {
              const r = data.result;
              saveWordWheelResult({
                puzzleNumber: number,
                puzzleDate: date,
                language,
                centerLetter: r.centerLetter || '',
                wordsFound: r.wordsFound,
                totalPossible: 0,
                score: r.score,
                timeSeconds: r.timeSeconds,
                streakDays: getDailyStreak().currentStreak,
                completedAt: r.completedAt || new Date().toISOString(),
              });
              if (!isMounted) return;
              setGameResult({ wordsFound: r.wordsFound, score: r.score, timeSeconds: r.timeSeconds });
              setPhase('already-played');
              return;
            }
          }
        }
      } catch {
        // Network error / timeout: worst case is a replay, which the server dedupes (23505).
      }

      if (!isMounted || entered()) return;
      setPuzzle(generateWordWheelPuzzle(date, language));

      // Returning players skip the ready card entirely; catch-up keeps it so the ad gate still applies.
      // The first-game bridge (`?start=1`) skips it for a first-timer too — one tap, no how-to.
      if (wordWheelBridgeSkipsReady({
        startParam: autoStart,
        hasEverPlayed: hasEverPlayedWordWheel(language),
        isCatchup,
        isPractice,
      })) {
        const tasks: Promise<unknown>[] = [prewarmDictionary(language)];
        if (preloadForPlay) tasks.push(preloadForPlay());
        await settleWithin(tasks, ENTRY_WARMUP_CAP_MS);
        if (!isMounted || entered()) return;
        enterPlaying();
        return;
      }
      setPhase('ready');
    };

    init();
    return () => { isMounted = false; };
    // `guestFingerprint` is deliberately NOT a dependency: init resolves it itself,
    // and re-running on the async state landing would double the server sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, isAuthenticated, authLoading, playerId, isPractice, catchupDate, isCatchup]);

  return {
    phase, setPhase, puzzle, setPuzzle, gameResult, setGameResult, puzzleNumber, enterPlaying,
  };
}
