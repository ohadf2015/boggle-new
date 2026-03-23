'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useCrazyGames } from '@/components/CrazyGamesSDK';

// Default thresholds for happyTime trigger
const DEFAULT_SCORE_THRESHOLD = 100;
const DEFAULT_COMBO_THRESHOLD = 5;
const DEFAULT_WORDS_THRESHOLD = 10;

/**
 * Configurable thresholds for triggering CrazyGames happyTime
 */
interface HappyTimeThresholds {
  /** Score threshold to trigger happyTime (default: 100) */
  score?: number;
  /** Combo threshold to trigger happyTime (default: 5) */
  combo?: number;
  /** Words found threshold to trigger happyTime (default: 10) */
  wordsFound?: number;
}

/**
 * Configuration options for the CrazyGames lifecycle hook
 */
interface CrazyGamesLifecycleConfig {
  /** Configurable thresholds for happyTime triggers */
  thresholds?: HappyTimeThresholds;
  /** Callback when gameplay starts */
  onGameplayStart?: () => void;
  /** Callback when gameplay stops */
  onGameplayStop?: () => void;
  /** Callback when happyTime is triggered */
  onHappyTime?: () => void;
  /** Whether to auto-pause game timer during ads (default: false) */
  pauseOnAd?: boolean;
  /** Callback when ad starts (for pausing game) */
  onAdStart?: () => void;
  /** Callback when ad ends (for resuming game) */
  onAdEnd?: () => void;
}

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
  /** Number of words found (triggers happyTime at threshold) */
  wordsFound?: number;
  /** Configuration options */
  config?: CrazyGamesLifecycleConfig;
}

interface CrazyGamesLifecycleReturn {
  /** Whether CrazyGames SDK is available */
  isAvailable: boolean;
  /** Whether on CrazyGames platform */
  isOnCrazyGamesPlatform: boolean;
  /** Whether gameplay has been started */
  hasStarted: boolean;
  /** Whether gameplay has ended */
  hasEnded: boolean;
  /** Whether gameplay is currently active (not paused by visibility) */
  isPlaying: boolean;
  /** Manually trigger happyTime (if not already triggered) */
  triggerHappyTime: () => void;
  /** Show a midgame ad with pause/resume callbacks */
  showMidgameAd: () => void;
}

/**
 * Hook to manage CrazyGames SDK lifecycle events automatically.
 *
 * Handles:
 * - gameplayStart() when game becomes active
 * - gameplayStop() when game ends or component unmounts
 * - happyTime() when player wins, hits score/combo/words threshold
 *
 * @example
 * ```tsx
 * const { isAvailable, triggerHappyTime, showMidgameAd } = useCrazyGamesLifecycle({
 *   isGameActive: gameActive && !isPaused,
 *   isGameOver: isGameOver,
 *   isWinner: finalScore > targetScore,
 *   score: currentScore,
 *   maxCombo: combo.maxCombo,
 *   wordsFound: wordsFoundCount,
 *   config: {
 *     thresholds: {
 *       score: 150,      // Custom score threshold
 *       combo: 7,        // Custom combo threshold
 *       wordsFound: 15,  // Custom words threshold
 *     },
 *     onHappyTime: () => console.log('Player is happy!'),
 *     pauseOnAd: true,
 *     onAdStart: () => pauseGameTimer(),
 *     onAdEnd: () => resumeGameTimer(),
 *   },
 * });
 * ```
 */
export function useCrazyGamesLifecycle({
  isGameActive,
  isGameOver,
  isWinner = false,
  score = 0,
  maxCombo = 0,
  wordsFound = 0,
  config = {},
}: CrazyGamesLifecycleOptions): CrazyGamesLifecycleReturn {
  const {
    gameplayStart,
    gameplayStop,
    happyTime,
    showMidgameAd: sdkShowMidgameAd,
    isAvailable,
    isOnCrazyGamesPlatform,
  } = useCrazyGames();

  const {
    thresholds = {},
    onGameplayStart,
    onGameplayStop,
    onHappyTime,
    pauseOnAd = false,
    onAdStart,
    onAdEnd,
  } = config;

  // Merge thresholds with defaults
  const scoreThreshold = thresholds.score ?? DEFAULT_SCORE_THRESHOLD;
  const comboThreshold = thresholds.combo ?? DEFAULT_COMBO_THRESHOLD;
  const wordsThreshold = thresholds.wordsFound ?? DEFAULT_WORDS_THRESHOLD;

  // Track if we've triggered events to prevent duplicates
  const hasStartedRef = useRef(false);
  const hasEndedRef = useRef(false);
  const hasTriggeredHappyTimeRef = useRef(false);
  const lastHappyTimeRef = useRef(0); // Timestamp of last happyTime trigger
  const lastScoreRef = useRef(0);
  const lastMaxComboRef = useRef(0);
  const lastWordsFoundRef = useRef(0);
  const isPlayingRef = useRef(false); // Track if gameplay is active (not paused by visibility)

  // Throttled happyTime trigger (max once per 30 seconds per CrazyGames recommendation)
  const triggerHappyTimeInternal = useCallback(() => {
    const now = Date.now();
    const timeSinceLastHappyTime = now - lastHappyTimeRef.current;
    const HAPPYTIME_THROTTLE_MS = 30000; // 30 seconds

    if (!hasTriggeredHappyTimeRef.current || timeSinceLastHappyTime >= HAPPYTIME_THROTTLE_MS) {
      hasTriggeredHappyTimeRef.current = true;
      lastHappyTimeRef.current = now;
      happyTime();
      onHappyTime?.();
    }
  }, [happyTime, onHappyTime]);

  // Manual happyTime trigger exposed to consumers
  const triggerHappyTime = useCallback(() => {
    triggerHappyTimeInternal();
  }, [triggerHappyTimeInternal]);

  // Show midgame ad with pause/resume callbacks
  const showMidgameAd = useCallback(() => {
    if (!isAvailable) return;

    sdkShowMidgameAd({
      adStarted: () => {
        if (pauseOnAd) {
          onAdStart?.();
        }
      },
      adFinished: () => {
        if (pauseOnAd) {
          onAdEnd?.();
        }
      },
      adError: () => {
        // Resume even on error
        if (pauseOnAd) {
          onAdEnd?.();
        }
      },
    });
  }, [isAvailable, sdkShowMidgameAd, pauseOnAd, onAdStart, onAdEnd]);

  // Handle gameplay start
  useEffect(() => {
    if (isGameActive && !hasStartedRef.current && !isGameOver) {
      hasStartedRef.current = true;
      hasEndedRef.current = false;
      hasTriggeredHappyTimeRef.current = false;
      isPlayingRef.current = true;
      // Reset threshold tracking refs so happyTime triggers fresh each game
      lastScoreRef.current = 0;
      lastMaxComboRef.current = 0;
      lastWordsFoundRef.current = 0;
      gameplayStart();
      onGameplayStart?.();

      if (process.env.NODE_ENV === 'development') {
        console.log('[CrazyGames Lifecycle] gameplayStart called');
      }
    }
  }, [isGameActive, isGameOver, gameplayStart, onGameplayStart]);

  // Handle gameplay end
  useEffect(() => {
    if (isGameOver && hasStartedRef.current && !hasEndedRef.current) {
      hasEndedRef.current = true;
      isPlayingRef.current = false;
      gameplayStop();
      onGameplayStop?.();

      if (process.env.NODE_ENV === 'development') {
        console.log('[CrazyGames Lifecycle] gameplayStop called (game over)');
      }
    }
  }, [isGameOver, gameplayStop, onGameplayStop]);

  // Handle happyTime for winner
  useEffect(() => {
    if (isWinner) {
      triggerHappyTimeInternal();
    }
  }, [isWinner, triggerHappyTimeInternal]);

  // Handle happyTime for score threshold
  useEffect(() => {
    if (
      score >= scoreThreshold &&
      lastScoreRef.current < scoreThreshold
    ) {
      triggerHappyTimeInternal();
    }
    lastScoreRef.current = score;
  }, [score, scoreThreshold, triggerHappyTimeInternal]);

  // Handle happyTime for combo threshold
  useEffect(() => {
    if (
      maxCombo >= comboThreshold &&
      lastMaxComboRef.current < comboThreshold
    ) {
      triggerHappyTimeInternal();
    }
    lastMaxComboRef.current = maxCombo;
  }, [maxCombo, comboThreshold, triggerHappyTimeInternal]);

  // Handle happyTime for words found threshold
  useEffect(() => {
    if (
      wordsFound >= wordsThreshold &&
      lastWordsFoundRef.current < wordsThreshold
    ) {
      triggerHappyTimeInternal();
    }
    lastWordsFoundRef.current = wordsFound;
  }, [wordsFound, wordsThreshold, triggerHappyTimeInternal]);

  // Handle visibility change - pause gameplay when tab hidden
  useEffect(() => {
    if (!hasStartedRef.current || hasEndedRef.current) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab hidden - pause gameplay
        if (isPlayingRef.current) {
          isPlayingRef.current = false;
          gameplayStop();
          if (process.env.NODE_ENV === 'development') {
            console.log('[CrazyGames Lifecycle] gameplayStop called (tab hidden)');
          }
        }
      } else {
        // Tab visible - resume gameplay (only if game is still active)
        if (!isPlayingRef.current && isGameActive && !isGameOver) {
          isPlayingRef.current = true;
          gameplayStart();
          if (process.env.NODE_ENV === 'development') {
            console.log('[CrazyGames Lifecycle] gameplayStart called (tab visible)');
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isGameActive, isGameOver, gameplayStart, gameplayStop]);

  // Cleanup on unmount - ensure gameplayStop is called
  useEffect(() => {
    return () => {
      if (hasStartedRef.current && !hasEndedRef.current) {
        isPlayingRef.current = false;
        gameplayStop();
        onGameplayStop?.();

        if (process.env.NODE_ENV === 'development') {
          console.log('[CrazyGames Lifecycle] gameplayStop called (unmount)');
        }
      }
    };
  }, [gameplayStop, onGameplayStop]);

  return {
    isAvailable,
    isOnCrazyGamesPlatform,
    hasStarted: hasStartedRef.current,
    hasEnded: hasEndedRef.current,
    isPlaying: isPlayingRef.current,
    triggerHappyTime,
    showMidgameAd,
  };
}

export default useCrazyGamesLifecycle;
