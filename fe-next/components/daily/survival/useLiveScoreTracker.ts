'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

const SCORE_HISTORY_CAP = 20;
import { getScoreBreakdown } from '@/utils/aiHintScoring';
import type { WordDiscovery, TargetAttempt } from './types';

export interface ScoreEvent {
  timestamp: number;
  delta: number;
  reason: 'word_discovered' | 'life_bonus' | 'target_attempt' | 'initial';
  metadata?: Record<string, unknown>;
}

export interface LiveScoreState {
  currentScore: number;
  lastIncrement: number | null;
  isScoreAnimating: boolean;
  scoreHistory: ScoreEvent[];
}

export interface LiveScoreActions {
  triggerScoreAnimation: (delta: number, reason: ScoreEvent['reason']) => void;
  resetScore: () => void;
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
}: UseLiveScoreTrackerProps): [LiveScoreState, LiveScoreActions] {
  const targetAttemptsCount = useMemo(
    () => attempts.filter(a => !a.isDiscovery).length,
    [attempts],
  );

  // During live play, project solved=true (show the score the player would
  // receive if they solved right now). On game over, honor the real outcome:
  // losses yield 0 to match the results page.
  const projectedSolved = isGameOver ? hasWon : true;

  const calculatedScore = useMemo(
    () =>
      getScoreBreakdown(
        lifePoints,
        targetAttemptsCount,
        discoveredWords.length,
        projectedSolved,
      ).total,
    [lifePoints, targetAttemptsCount, discoveredWords.length, projectedSolved],
  );

  const [currentScore, setCurrentScore] = useState(0);
  const [lastIncrement, setLastIncrement] = useState<number | null>(null);
  const [isScoreAnimating, setIsScoreAnimating] = useState(false);
  const [scoreHistory, setScoreHistory] = useState<ScoreEvent[]>([]);

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

      const event: ScoreEvent = {
        timestamp: Date.now(),
        delta,
        reason: delta > 0 ? 'word_discovered' : 'target_attempt',
      };
      setScoreHistory(prev => {
        const next = prev.length >= SCORE_HISTORY_CAP
          ? [...prev.slice(prev.length - SCORE_HISTORY_CAP + 1), event]
          : [...prev, event];
        return next;
      });

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

  const triggerScoreAnimation = useCallback((delta: number, reason: ScoreEvent['reason']) => {
    if (delta === 0 || isNaN(delta)) return;

    setLastIncrement(delta);
    setIsScoreAnimating(true);

    const event: ScoreEvent = {
      timestamp: Date.now(),
      delta,
      reason,
    };
    setScoreHistory(prev => {
      const next = prev.length >= SCORE_HISTORY_CAP
        ? [...prev.slice(prev.length - SCORE_HISTORY_CAP + 1), event]
        : [...prev, event];
      return next;
    });

    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    animationTimeoutRef.current = setTimeout(() => {
      setIsScoreAnimating(false);
      setLastIncrement(null);
    }, 600);
  }, []);

  const resetScore = useCallback(() => {
    setCurrentScore(0);
    setLastIncrement(null);
    setIsScoreAnimating(false);
    setScoreHistory([]);
    previousScoreRef.current = 0;
    didInitRef.current = false;
  }, []);

  const state: LiveScoreState = {
    currentScore: Math.max(0, currentScore),
    lastIncrement,
    isScoreAnimating,
    scoreHistory,
  };

  const actions: LiveScoreActions = {
    triggerScoreAnimation,
    resetScore,
  };

  return [state, actions];
}
