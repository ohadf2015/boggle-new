'use client';

import { useEffect, useRef } from 'react';
import { useCrazyGames } from '@/components/CrazyGamesSDK';

interface CrazyGamesLifecycleOptions {
  /** Whether the game is currently active/playing */
  isGameActive: boolean;
  /** Whether the game has ended */
  isGameOver: boolean;
  /** Whether the player won (triggers happyTime) */
  isWinner?: boolean;
  /** Current score (triggers happyTime at thresholds) */
  score?: number;
  /** Maximum combo achieved (triggers happyTime at high combos) */
  maxCombo?: number;
}

// Score thresholds for happyTime trigger
const HAPPY_TIME_SCORE_THRESHOLD = 100;
const HAPPY_TIME_COMBO_THRESHOLD = 5;

/**
 * Hook to manage CrazyGames SDK lifecycle events automatically.
 *
 * Handles:
 * - gameplayStart() when game becomes active
 * - gameplayStop() when game ends or component unmounts
 * - happyTime() when player wins, hits score threshold, or achieves high combo
 *
 * @example
 * ```tsx
 * useCrazyGamesLifecycle({
 *   isGameActive: gameActive && !isPaused,
 *   isGameOver: isGameOver,
 *   isWinner: finalScore > targetScore,
 *   score: currentScore,
 *   maxCombo: combo.maxCombo,
 * });
 * ```
 */
export function useCrazyGamesLifecycle({
  isGameActive,
  isGameOver,
  isWinner = false,
  score = 0,
  maxCombo = 0,
}: CrazyGamesLifecycleOptions): void {
  const { gameplayStart, gameplayStop, happyTime, isAvailable } = useCrazyGames();

  // Track if we've triggered events to prevent duplicates
  const hasStartedRef = useRef(false);
  const hasEndedRef = useRef(false);
  const hasTriggeredHappyTimeRef = useRef(false);
  const lastScoreRef = useRef(0);
  const lastMaxComboRef = useRef(0);

  // Handle gameplay start
  useEffect(() => {
    if (isGameActive && !hasStartedRef.current && !isGameOver) {
      hasStartedRef.current = true;
      hasEndedRef.current = false;
      hasTriggeredHappyTimeRef.current = false;
      gameplayStart();
    }
  }, [isGameActive, isGameOver, gameplayStart]);

  // Handle gameplay end
  useEffect(() => {
    if (isGameOver && hasStartedRef.current && !hasEndedRef.current) {
      hasEndedRef.current = true;
      gameplayStop();
    }
  }, [isGameOver, gameplayStop]);

  // Handle happyTime for winner
  useEffect(() => {
    if (isWinner && !hasTriggeredHappyTimeRef.current) {
      hasTriggeredHappyTimeRef.current = true;
      happyTime();
    }
  }, [isWinner, happyTime]);

  // Handle happyTime for score threshold
  useEffect(() => {
    if (
      score >= HAPPY_TIME_SCORE_THRESHOLD &&
      lastScoreRef.current < HAPPY_TIME_SCORE_THRESHOLD &&
      !hasTriggeredHappyTimeRef.current
    ) {
      hasTriggeredHappyTimeRef.current = true;
      happyTime();
    }
    lastScoreRef.current = score;
  }, [score, happyTime]);

  // Handle happyTime for combo threshold
  useEffect(() => {
    if (
      maxCombo >= HAPPY_TIME_COMBO_THRESHOLD &&
      lastMaxComboRef.current < HAPPY_TIME_COMBO_THRESHOLD &&
      !hasTriggeredHappyTimeRef.current
    ) {
      hasTriggeredHappyTimeRef.current = true;
      happyTime();
    }
    lastMaxComboRef.current = maxCombo;
  }, [maxCombo, happyTime]);

  // Cleanup on unmount - ensure gameplayStop is called
  useEffect(() => {
    return () => {
      if (hasStartedRef.current && !hasEndedRef.current) {
        gameplayStop();
      }
    };
  }, [gameplayStop]);
}

export default useCrazyGamesLifecycle;
