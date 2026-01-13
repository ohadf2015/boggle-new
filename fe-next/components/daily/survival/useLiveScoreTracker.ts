'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { calculateEfficiencyScore } from '@/utils/aiHintGenerator';
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
}

/**
 * Hook to track real-time score changes during survival gameplay
 * Calculates incremental score deltas and triggers animations
 */
export function useLiveScoreTracker({
  lifePoints,
  clueTokens,
  discoveredWords,
  attempts,
  isGameOver = false,
}: UseLiveScoreTrackerProps): [LiveScoreState, LiveScoreActions] {
  const [currentScore, setCurrentScore] = useState(0);
  const [lastIncrement, setLastIncrement] = useState<number | null>(null);
  const [isScoreAnimating, setIsScoreAnimating] = useState(false);
  const [scoreHistory, setScoreHistory] = useState<ScoreEvent[]>([]);

  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousScoreRef = useRef(0);

  // Calculate current score based on game state
  // During gameplay, show potential score (what you'd get if you solved now)
  // Pass `true` for solved to show live potential score, not 0
  const calculatedScore = calculateEfficiencyScore(
    lifePoints,
    clueTokens,
    attempts.length,
    discoveredWords.length,
    true // Always calculate as if solved to show potential score
  );

  // Update score when calculated score changes
  useEffect(() => {
    if (isGameOver) {
      // On game over, set final score without animation
      setCurrentScore(Math.max(0, calculatedScore));
      setLastIncrement(null);
      setIsScoreAnimating(false);
      return;
    }

    const delta = calculatedScore - previousScoreRef.current;

    if (delta !== 0 && !isNaN(delta)) {
      setCurrentScore(Math.max(0, calculatedScore));
      setLastIncrement(delta);
      setIsScoreAnimating(true);

      // Add to history
      const event: ScoreEvent = {
        timestamp: Date.now(),
        delta,
        reason: delta > 0 ? 'word_discovered' : 'target_attempt',
      };
      setScoreHistory(prev => [...prev, event]);

      // Clear animation state after animation completes
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      animationTimeoutRef.current = setTimeout(() => {
        setIsScoreAnimating(false);
        setLastIncrement(null);
      }, 600); // Match animation duration

      previousScoreRef.current = calculatedScore;
    }
  }, [calculatedScore, isGameOver]);

  // Cleanup timeout on unmount
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
    setScoreHistory(prev => [...prev, event]);

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
