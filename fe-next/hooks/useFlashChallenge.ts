'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { FlashChallenge } from '@/types/adventure';
import { getFlashChallengeForWorld } from '@/lib/adventure/flashChallengeConfig';

const TRIGGER_THRESHOLDS = [0.30, 0.60, 0.85] as const;

interface UseFlashChallengeProps {
  worldId: number;
  totalTimeSeconds: number;
  timeRemaining: number;
  wordsFound: string[];
  isPlaying: boolean;
  /** Tile types used in the most recently submitted word (for useGoldTile challenge) */
  lastWordTileTypes?: string[];
  /** Current locale for filtering language-specific challenges */
  locale?: string;
}

interface UseFlashChallengeReturn {
  activeChallenge: FlashChallenge | null;
  isChallengeComplete: boolean;
  isChallengeFailed: boolean;
  challengeTimeLeft: number;
  dismiss: () => void;
  reset: () => void;
}

/** Check if a word contains consecutive double letters (e.g., "book" has "oo") */
function hasDoubleLetters(word: string): boolean {
  const upper = word.toUpperCase();
  for (let i = 0; i < upper.length - 1; i++) {
    if (upper[i] === upper[i + 1]) return true;
  }
  return false;
}

/** Check if a word is a palindrome */
function isPalindrome(word: string): boolean {
  const upper = word.toUpperCase();
  const len = upper.length;
  for (let i = 0; i < Math.floor(len / 2); i++) {
    if (upper[i] !== upper[len - 1 - i]) return false;
  }
  return true;
}

export function useFlashChallenge({
  worldId,
  totalTimeSeconds,
  timeRemaining,
  wordsFound,
  isPlaying,
  lastWordTileTypes,
  locale = 'en',
}: UseFlashChallengeProps): UseFlashChallengeReturn {
  const [activeChallenge, setActiveChallenge] = useState<FlashChallenge | null>(null);
  const [isChallengeComplete, setIsChallengeComplete] = useState(false);
  const [isChallengeFailed, setIsChallengeFailed] = useState(false);
  const [challengeTimeLeft, setChallengeTimeLeft] = useState(0);
  const failedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** How many challenges have triggered this level (max 3 at 30%/60%/85% elapsed) */
  const triggerCount = useRef(0);
  const challengeStartWords = useRef<string[]>([]);
  const challengeStartTime = useRef<number>(0);
  const usedGoldTile = useRef(false);
  // Track the timestamp when words are found (for fastWord race condition fix)
  const lastWordTimestamp = useRef<number>(0);

  // Update word timestamp on every new word
  useEffect(() => {
    if (wordsFound.length > 0) {
      lastWordTimestamp.current = Date.now();
    }
  }, [wordsFound.length]);

  // Trigger at 30% elapsed
  useEffect(() => {
    if (!isPlaying || activeChallenge) return;
    const nextThreshold = TRIGGER_THRESHOLDS[triggerCount.current];
    if (!nextThreshold) return; // All 3 challenges used
    const elapsed = totalTimeSeconds - timeRemaining;
    const pct = elapsed / totalTimeSeconds;
    if (pct >= nextThreshold) {
      triggerCount.current += 1;
      const candidates = getFlashChallengeForWorld(worldId, locale);
      const challenge = candidates[Math.floor(Math.random() * candidates.length)];
      setActiveChallenge(challenge);
      setChallengeTimeLeft(challenge.durationSeconds);
      challengeStartWords.current = [...wordsFound];
      challengeStartTime.current = Date.now();
      usedGoldTile.current = false;
    }
  }, [timeRemaining, isPlaying, totalTimeSeconds, worldId, locale, activeChallenge, wordsFound]);

  // Track accumulated pause time so the challenge clock freezes when game is paused.
  const pauseStartRef = useRef<number>(0);
  const totalPausedMsRef = useRef<number>(0);

  // Accumulate paused time when isPlaying toggles off/on
  useEffect(() => {
    if (!activeChallenge || isChallengeComplete) return;
    if (!isPlaying) {
      // Game just paused — record when
      pauseStartRef.current = Date.now();
    } else if (pauseStartRef.current > 0) {
      // Game just resumed — add paused duration
      totalPausedMsRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = 0;
    }
  }, [isPlaying, activeChallenge, isChallengeComplete]);

  // Live countdown timer — subtracts paused time from elapsed calculation
  useEffect(() => {
    if (!activeChallenge || isChallengeComplete) return;
    const interval = setInterval(() => {
      // Don't tick while paused
      if (!isPlaying) return;
      const elapsed = (Date.now() - challengeStartTime.current - totalPausedMsRef.current) / 1000;
      const remaining = Math.max(0, activeChallenge.durationSeconds - elapsed);
      setChallengeTimeLeft(Math.ceil(remaining));
      if (remaining <= 0) {
        setIsChallengeFailed(true);
        clearInterval(interval);
        failedTimerRef.current = setTimeout(() => {
          setActiveChallenge(null);
          setIsChallengeFailed(false);
        }, 1500);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeChallenge, isChallengeComplete, isPlaying]);

  // Track gold tile usage from lastWordTileTypes prop
  useEffect(() => {
    if (!activeChallenge || activeChallenge.type !== 'useGoldTile') return;
    if (lastWordTileTypes?.includes('gold')) {
      usedGoldTile.current = true;
    }
  }, [lastWordTileTypes, activeChallenge]);

  // Check completion for all 10 challenge types
  useEffect(() => {
    if (!activeChallenge || isChallengeComplete) return;
    const newWords = wordsFound.filter(w => !challengeStartWords.current.includes(w));
    let complete = false;
    const param = activeChallenge.param;

    switch (activeChallenge.type) {
      case 'longWord':
        complete = newWords.some(w => w.length >= (param as number));
        break;
      case 'specificLetter': {
        const letter = (param as string).toUpperCase();
        complete = newWords.some(w => w.toUpperCase().includes(letter));
        break;
      }
      case 'comboStreak':
        complete = newWords.length >= (param as number);
        break;
      case 'fastWord': {
        // Use word submission timestamp (not effect-run time) to avoid React batching race condition
        const wordSubmitTime = lastWordTimestamp.current;
        const elapsedSec = wordSubmitTime > 0 ? (wordSubmitTime - challengeStartTime.current) / 1000 : Infinity;
        complete = newWords.length > 0 && elapsedSec <= (param as number);
        break;
      }
      case 'startsWith': {
        const prefix = (param as string).toUpperCase();
        complete = newWords.some(w => w.toUpperCase().startsWith(prefix));
        break;
      }
      case 'endsWith': {
        const suffix = (param as string).toUpperCase();
        complete = newWords.some(w => w.toUpperCase().endsWith(suffix));
        break;
      }
      case 'doubleLetters':
        complete = newWords.some(w => hasDoubleLetters(w));
        break;
      case 'palindrome': {
        const minLen = (param as number) || 3;
        complete = newWords.some(w => w.length >= minLen && isPalindrome(w));
        break;
      }
      case 'exactLength':
        complete = newWords.some(w => w.length === (param as number));
        break;
      case 'useGoldTile':
        complete = usedGoldTile.current;
        break;
    }
    if (complete) setIsChallengeComplete(true);
  }, [wordsFound, activeChallenge, isChallengeComplete]);

  // Cleanup failed timer on unmount
  useEffect(() => {
    return () => {
      if (failedTimerRef.current) clearTimeout(failedTimerRef.current);
    };
  }, []);

  const dismiss = useCallback(() => {
    if (failedTimerRef.current) {
      clearTimeout(failedTimerRef.current);
      failedTimerRef.current = null;
    }
    setActiveChallenge(null);
    setIsChallengeComplete(false);
    setIsChallengeFailed(false);
    setChallengeTimeLeft(0);
  }, []);

  const reset = useCallback(() => {
    if (failedTimerRef.current) {
      clearTimeout(failedTimerRef.current);
      failedTimerRef.current = null;
    }
    setActiveChallenge(null);
    setIsChallengeComplete(false);
    setIsChallengeFailed(false);
    setChallengeTimeLeft(0);
    triggerCount.current = 0;
    challengeStartWords.current = [];
    challengeStartTime.current = 0;
    usedGoldTile.current = false;
    lastWordTimestamp.current = 0;
    pauseStartRef.current = 0;
    totalPausedMsRef.current = 0;
  }, []);

  return { activeChallenge, isChallengeComplete, isChallengeFailed, challengeTimeLeft, dismiss, reset };
}
