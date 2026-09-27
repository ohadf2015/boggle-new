'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useCrazyGames } from '@/components/CrazyGamesSDK';

// Default thresholds for happyTime trigger — CrazyGames requires these for
// "major achievements only" (boss defeated, high score). Keep meaningful but
// achievable in short sessions (60-90s daily challenge, word hunt).
const DEFAULT_SCORE_THRESHOLD = 200;
const DEFAULT_COMBO_THRESHOLD = 5;
const DEFAULT_WORDS_THRESHOLD = 12;

/**
 * Configurable thresholds for triggering CrazyGames happyTime
 */
interface HappyTimeThresholds {
  /** Score threshold to trigger happyTime (default: 500) */
  score?: number;
  /** Combo threshold to trigger happyTime (default: 10) */
  combo?: number;
  /** Words found threshold to trigger happyTime (default: 25) */
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
  /**
   * Unique identifier per gameplay session — change between tournament rounds /
   * rematches to reset internal start/end refs so `gameplayStart()` fires again.
   * If omitted, only the first session lifecycle is reported (legacy behaviour).
   */
  roundKey?: string | number;
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
  roundKey,
  config = {},
}: CrazyGamesLifecycleOptions): CrazyGamesLifecycleReturn {
  const {
    gameplayStart,
    gameplayStop,
    happyTime,
    loadingStart,
    loadingStop,
    trackEvent,
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

  // Track if we've triggered events to prevent duplicates.
  // Refs are used for synchronous reads within effects; state mirrors drive re-renders.
  const hasStartedRef = useRef(false);
  const hasEndedRef = useRef(false);
  const hasTriggeredHappyTimeRef = useRef(false);
  const lastHappyTimeRef = useRef(0);
  const lastScoreRef = useRef(0);
  const lastMaxComboRef = useRef(0);
  const lastWordsFoundRef = useRef(0);
  const isPlayingRef = useRef(false);

  // State mirrors so consumers get re-renders
  const [hasStarted, setHasStarted] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

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

  // Reset start/end refs when roundKey changes AFTER a round ended.
  // This lets tournament round 2+ fire gameplayStart again. Skipped when game
  // is mid-round so a stray prop change doesn't double-fire start.
  const lastRoundKeyRef = useRef(roundKey);
  useEffect(() => {
    if (lastRoundKeyRef.current === roundKey) return;
    lastRoundKeyRef.current = roundKey;
    if (hasStartedRef.current && hasEndedRef.current) {
      hasStartedRef.current = false;
      hasEndedRef.current = false;
      hasTriggeredHappyTimeRef.current = false;
      scoreTriggeredRef.current = false;
      setHasStarted(false);
      setHasEnded(false);
    }
  }, [roundKey]);

  // Signal loading between game sessions (CrazyGames uses this for load time metrics)
  const hasSignaledLoadingRef = useRef(false);
  useEffect(() => {
    // When game is not active and hasn't started yet, signal loading
    if (!isGameActive && !hasStartedRef.current && !hasSignaledLoadingRef.current) {
      hasSignaledLoadingRef.current = true;
      loadingStart?.();
    }
  }, [isGameActive, loadingStart]);

  // Handle gameplay start
  useEffect(() => {
    if (isGameActive && !hasStartedRef.current && !isGameOver) {
      // Stop loading signal if we sent one
      if (hasSignaledLoadingRef.current) {
        loadingStop?.();
        hasSignaledLoadingRef.current = false;
      }
      hasStartedRef.current = true;
      hasEndedRef.current = false;
      hasTriggeredHappyTimeRef.current = false;
      isPlayingRef.current = true;
      setHasStarted(true);
      setHasEnded(false);
      setIsPlaying(true);
      // Snapshot current values so only future changes trigger happyTime
      lastScoreRef.current = score;
      lastMaxComboRef.current = maxCombo;
      lastWordsFoundRef.current = wordsFound;
      gameplayStart();
      trackEvent('game_start');
      onGameplayStart?.();

      if (process.env.NODE_ENV === 'development') {
        console.log('[CrazyGames Lifecycle] gameplayStart called');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- score/maxCombo/wordsFound intentionally excluded: only snapshot initial values via refs
  }, [isGameActive, isGameOver, gameplayStart, loadingStop, onGameplayStart, trackEvent]);

  // Handle gameplay end
  useEffect(() => {
    if (isGameOver && hasStartedRef.current && !hasEndedRef.current) {
      hasEndedRef.current = true;
      isPlayingRef.current = false;
      setHasEnded(true);
      setIsPlaying(false);
      gameplayStop();
      trackEvent('game_end');
      onGameplayStop?.();

      if (process.env.NODE_ENV === 'development') {
        console.log('[CrazyGames Lifecycle] gameplayStop called (game over)');
      }
    }
  }, [isGameOver, gameplayStop, onGameplayStop, trackEvent]);

  // Handle happyTime for winner
  useEffect(() => {
    if (isWinner) {
      triggerHappyTimeInternal();
    }
  }, [isWinner, triggerHappyTimeInternal]);

  // Handle happyTime for score threshold (only after gameplay started, skip initial snapshot)
  const scoreTriggeredRef = useRef(false);
  useEffect(() => {
    if (!hasStartedRef.current) return;
    // Skip first effect run after game start to snapshot the baseline
    if (lastScoreRef.current === score) return;
    if (
      !scoreTriggeredRef.current &&
      score >= scoreThreshold
    ) {
      scoreTriggeredRef.current = true;
      triggerHappyTimeInternal();
    }
    lastScoreRef.current = score;
  }, [score, scoreThreshold, triggerHappyTimeInternal]);

  // Handle happyTime for combo threshold (only after gameplay started)
  useEffect(() => {
    if (!hasStartedRef.current) return;
    if (
      maxCombo >= comboThreshold &&
      lastMaxComboRef.current < comboThreshold
    ) {
      triggerHappyTimeInternal();
    }
    lastMaxComboRef.current = maxCombo;
  }, [maxCombo, comboThreshold, triggerHappyTimeInternal]);

  // Handle happyTime for words found threshold (only after gameplay started)
  useEffect(() => {
    if (!hasStartedRef.current) return;
    if (
      wordsFound >= wordsThreshold &&
      lastWordsFoundRef.current < wordsThreshold
    ) {
      triggerHappyTimeInternal();
    }
    lastWordsFoundRef.current = wordsFound;
  }, [wordsFound, wordsThreshold, triggerHappyTimeInternal]);

  // Pause/resume gameplay on tab visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!isPlayingRef.current) return;
      if (document.hidden) {
        gameplayStop();
      } else {
        gameplayStart();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [gameplayStart, gameplayStop]);

  // Cleanup on unmount - ensure gameplayStop is called
  useEffect(() => {
    return () => {
      if (hasStartedRef.current && !hasEndedRef.current) {
        isPlayingRef.current = false;
        // Note: setState in cleanup won't cause re-render (component is unmounting)
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
    hasStarted,
    hasEnded,
    isPlaying,
    triggerHappyTime,
    showMidgameAd,
  };
}

export default useCrazyGamesLifecycle;
