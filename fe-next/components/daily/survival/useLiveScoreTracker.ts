'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { getScoreBreakdown } from '@/utils/aiHintScoring';
import type { WordDiscovery, TargetAttempt } from './types';

export interface LiveScoreState {
  currentScore: number;
  lastIncrement: number | null;
  isScoreAnimating: boolean;
}

export interface UseLiveScoreTrackerProps {
  lifePoints: number;
  clueTokens: number;
  discoveredWords: WordDiscovery[];
  attempts: TargetAttempt[];
  isGameOver?: boolean;
  /**
   * When isGameOver=true, this gates whether score reflects the real final total
   * (hasWon=true) or collapses to 0 (hasWon=false) — mirrors the results-page rule
   * that losses score 0.
   */
  hasWon?: boolean;
}

/**
 * Live Season-2 score projection during survival gameplay.
 * Mirrors `getScoreBreakdown` from the results page so the HUD always shows
 * "what would appear on results if you solved right now". Score starts at 800
 * on a fresh game (perfect speed + accuracy, 0 exploration) and erodes as life
 * drops / target attempts miss, while exploration adds +10 per discovered word.
 * On game over, a loss drops the score to 0 to match the real final payload.
 */
export function useLiveScoreTracker({
  lifePoints,
  clueTokens: _clueTokens,
  discoveredWords,
  attempts,
  isGameOver = false,
  hasWon = false,
}: UseLiveScoreTrackerProps): LiveScoreState {
  const targetAttemptsCount = useMemo(
    () => attempts.filter(a => !a.isDiscovery).length,
    [attempts],
  );

  // During live play, project solved=true (show the score the player would
  // receive if they solved right now). On game over, honor the real outcome:
  // losses yield 0 to match the results page.
  const projectedSolved = isGameOver ? hasWon : true;

  // The guess-efficiency exploration floor rewards an ACTUAL solve, so apply it
  // only at game over (final score). During live play it would project the
  // exploration ceiling from turn one and kill the incentive to farm words.
  const calculatedScore = useMemo(
    () =>
      getScoreBreakdown(
        lifePoints,
        targetAttemptsCount,
        discoveredWords.length,
        projectedSolved,
        isGameOver,
      ).total,
    [lifePoints, targetAttemptsCount, discoveredWords.length, projectedSolved, isGameOver],
  );

  const [currentScore, setCurrentScore] = useState(0);
  const [lastIncrement, setLastIncrement] = useState<number | null>(null);
  const [isScoreAnimating, setIsScoreAnimating] = useState(false);

  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousScoreRef = useRef(0);
  const didInitRef = useRef(false);

  useEffect(() => {
    if (!didInitRef.current) {
      didInitRef.current = true;
      setCurrentScore(Math.max(0, calculatedScore));
      previousScoreRef.current = calculatedScore;
      return;
    }

    if (isGameOver) {
      setCurrentScore(Math.max(0, calculatedScore));
      setLastIncrement(null);
      setIsScoreAnimating(false);
      previousScoreRef.current = calculatedScore;
      return;
    }

    const delta = calculatedScore - previousScoreRef.current;

    if (delta !== 0 && !isNaN(delta)) {
      setCurrentScore(Math.max(0, calculatedScore));
      setLastIncrement(delta);
      setIsScoreAnimating(true);

      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      animationTimeoutRef.current = setTimeout(() => {
        setIsScoreAnimating(false);
        setLastIncrement(null);
      }, 600);

      previousScoreRef.current = calculatedScore;
    }
  }, [calculatedScore, isGameOver]);

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  return {
    currentScore: Math.max(0, currentScore),
    lastIncrement,
    isScoreAnimating,
  };
}
