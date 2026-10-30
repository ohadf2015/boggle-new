'use client';

import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import {
  generateDailyPuzzle,
  getDailyChallengeDate,
  getPuzzleNumber,
  getTodaysWordHuntResult,
  getGuestFingerprint,
  mapServerResultToStoredResult,
  getWordHuntResultKey,
  hasWordHuntForfeitToday,
  type StoredWordHuntResult,
} from '@/utils/dailyChallenge';
import { isUsableDailyPuzzle } from '@/utils/dailyChallenge/puzzlePayload';
import { getOfflineStore } from '@/lib/offline';
import { getCachedDailyPuzzle } from '@/lib/offline/prefetchDaily';
import type { LetterGrid, Language } from '@/types';
import type { DailyChallengePhase } from '../DailyChallenge';
import { consumeUnfinishedWordHuntRun } from './runStartedMarker';

type SetFn<T> = Dispatch<SetStateAction<T>>;

export interface WordHuntPuzzleInitDeps {
  gameLanguage: Language;
  wasReset: boolean;
  isAuthenticated: boolean;
  profileId: string | null;
  catchupDate: string | null;
  isPractice: boolean;
  online: boolean;
  setPhase: SetFn<DailyChallengePhase>;
  setPuzzleDate: SetFn<string>;
  setPuzzleNumber: SetFn<number>;
  setForfeitedToday: SetFn<boolean>;
  setStoredResult: SetFn<StoredWordHuntResult | null>;
  setGrid: SetFn<LetterGrid | null>;
  setTargetWord: SetFn<string>;
  setMeaning: SetFn<string | null>;
}

/** Loads today's (or a catch-up day's) Word Hunt puzzle, or routes to the saved result if already played. */
export function useWordHuntPuzzleInit({
  gameLanguage, wasReset, isAuthenticated, profileId, catchupDate, isPractice, online,
  setPhase, setPuzzleDate, setPuzzleNumber, setForfeitedToday, setStoredResult, setGrid, setTargetWord, setMeaning,
}: WordHuntPuzzleInitDeps) {
  const isCatchup = !!catchupDate;
  const prevGameLanguageRef = useRef<Language | null>(null);
  const prevWasResetRef = useRef<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const languageChanged = prevGameLanguageRef.current !== null && prevGameLanguageRef.current !== gameLanguage;
    const wasJustReset = wasReset && !prevWasResetRef.current;
    const needsFullReload = languageChanged || wasJustReset || prevGameLanguageRef.current === null;

    prevGameLanguageRef.current = gameLanguage;
    prevWasResetRef.current = wasReset;

    if (needsFullReload) setPhase('loading');

    const initializePuzzle = async () => {
      const date = catchupDate || getDailyChallengeDate();
      const number = getPuzzleNumber(date);
      if (!isMounted) return;
      setPuzzleDate(date);
      setPuzzleNumber(number);

      // Mid-game forfeit today (no saved result) → gate re-entry behind a
      // rewarded ad on native. Skipped for practice + post-retry replays.
      const abandonedRun = !isPractice && !isCatchup && consumeUnfinishedWordHuntRun(gameLanguage, date);
      setForfeitedToday(!isPractice && !wasJustReset && (abandonedRun || hasWordHuntForfeitToday(gameLanguage)));

      // Practice mode: bypass already-played gates so the player can replay safely.
      // Catch-up skips the today-only local cache (it's keyed to today) but still
      // runs the server check below, which gates by the catch-up `date`.
      if (!wasJustReset && !isPractice) {
        const localResult = isCatchup ? null : getTodaysWordHuntResult(gameLanguage);
        if (localResult) {
          if (!isMounted) return;
          setStoredResult(localResult);
          setPhase('already-played');
          return;
        }

        try {
          const fp = await getGuestFingerprint();
          const checkParams = new URLSearchParams();
          if (isAuthenticated && profileId) checkParams.set('playerId', profileId);
          else if (fp) checkParams.set('guestFingerprint', fp);

          if (checkParams.toString()) {
            const checkResponse = await fetch(
              `/api/daily-challenge/word-hunt/check-played/${date}/${gameLanguage}?${checkParams.toString()}`
            );
            if (!isMounted) return;
            if (checkResponse.ok) {
              const checkData = await checkResponse.json();
              if (checkData.hasPlayed && checkData.result) {
                const serverResult = mapServerResultToStoredResult(
                  checkData.result, date, number, gameLanguage, checkData.streak?.currentStreak || 0
                );
                if (typeof window !== 'undefined') {
                  const storageKey = getWordHuntResultKey(gameLanguage, date);
                  localStorage.setItem(storageKey, JSON.stringify(serverResult));
                }
                setStoredResult(serverResult);
                setPhase('already-played');
                return;
              }
            }
          }
        } catch (checkError) {
          console.warn('Failed to check server for existing attempt:', checkError);
        }
      }

      if (!online) {
        const store = await getOfflineStore();
        const cached = await getCachedDailyPuzzle<{ grid: LetterGrid; targetWord: string; meaning?: string | null }>(
          store, date, gameLanguage, 'wordhunt',
        );
        if (cached && isMounted) {
          setGrid(cached.grid);
          setTargetWord(cached.targetWord);
          setMeaning(cached.meaning ?? null);
          setPhase('ready');
          return;
        }
        if (isMounted) setPhase('offline-miss');
        return;
      }

      try {
        const response = await fetch(`/api/daily-challenge/puzzle/${date}/${gameLanguage}`);
        if (!isMounted) return;
        const puzzleData = response.ok ? await response.json().catch(() => null) : null;
        if (!isMounted) return;
        if (isUsableDailyPuzzle(puzzleData)) {
          setGrid(puzzleData.grid);
          setTargetWord(puzzleData.targetWord);
          setMeaning(puzzleData.meaning ?? null);
        } else {
          // ok-but-empty body, non-ok status, or unparseable JSON → generate locally
          const puzzle = generateDailyPuzzle(date, gameLanguage);
          if (!isMounted) return;
          setGrid(puzzle.grid);
          setTargetWord(puzzle.targetWord);
          setMeaning(null);
        }
      } catch {
        if (!isMounted) return;
        const puzzle = generateDailyPuzzle(date, gameLanguage);
        setGrid(puzzle.grid);
        setTargetWord(puzzle.targetWord);
        setMeaning(null);
      }

      if (!isMounted) return;
      setPhase('ready');
    };

    initializePuzzle();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameLanguage, wasReset, isAuthenticated, profileId, catchupDate]);
}
