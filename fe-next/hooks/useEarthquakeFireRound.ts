import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { generateRandomTable } from '@/utils/utils';
import { DIFFICULTIES } from '@/utils/consts';
import {
  DEFAULT_EARTHQUAKE_CONFIG,
  type EarthquakeState,
  type UseEarthquakeFireRoundOptions,
  type UseEarthquakeFireRoundReturn,
  type EarthquakeConfig,
  type TriggerEarthquakePayload,
} from '@/shared/types/earthquake';

/**
 * useEarthquakeFireRound
 *
 * Manages earthquake/fire round feature for both single-player and multiplayer modes.
 *
 * Features:
 * - Triggers randomly in last 35% of game (65-100% elapsed), with dynamic buffer before end
 * - Warning phase (2s) → Shake phase (1s) → Fire round (15s)
 * - 2x score multiplier during fire round
 * - Complete grid regeneration with new embedded words
 * - Multiplayer: Host emits socket events, all players sync
 *
 * @param options Configuration options
 * @returns Earthquake state and control functions
 */
export function useEarthquakeFireRound(
  options: UseEarthquakeFireRoundOptions
): UseEarthquakeFireRoundReturn {
  const {
    enabled,
    gameDurationSeconds,
    currentTimeSeconds,
    language,
    difficulty,
    mode,
    onGridRegenerate,
    onEarthquakeStart,
    onEarthquakeShake,
    onFireRoundStart,
    onFireRoundEnd,
    onTimerPause,
    onTimerResume,
    socket,
    isHost = false,
    gameSessionId,
    config: configOverride,
  } = options;

  // Merge default config with overrides
  const config: EarthquakeConfig = useMemo(
    () => ({ ...DEFAULT_EARTHQUAKE_CONFIG, ...configOverride }),
    [configOverride]
  );

  // State
  const [earthquakeState, setEarthquakeState] = useState<EarthquakeState>('idle');
  const [fireRoundActive, setFireRoundActive] = useState(false);
  const [fireRoundRemaining, setFireRoundRemaining] = useState(0);

  // Refs
  const earthquakeTriggeredRef = useRef(false);
  const triggerTimeRef = useRef<number | null>(null);
  const fireRoundTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shakeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset refs when game session changes (new game started)
  useEffect(() => {
    earthquakeTriggeredRef.current = false;
    triggerTimeRef.current = null;
    setEarthquakeState('idle');
    setFireRoundActive(false);
    setFireRoundRemaining(0);

    // Clear any pending timers from previous session
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
    if (fireRoundTimerRef.current) clearInterval(fireRoundTimerRef.current);
  }, [gameSessionId]);

  // Calculate trigger time (random time in last 24% of game, but at least 20 sec before end)
  useEffect(() => {
    if (!enabled || triggerTimeRef.current !== null) return;

    // Don't trigger for very short games
    if (gameDurationSeconds < config.minGameDurationSeconds) {
      return;
    }

    // Calculate trigger window: 70% elapsed to (total - buffer) elapsed
    // Min: configured % of game has elapsed (e.g., 70% = last 30% window)
    const minTriggerElapsed = gameDurationSeconds * config.triggerPercentageMin;
    // Max: Leave enough buffer for earthquake + fire round (18s total) + safety margin
    // Use dynamic buffer: 18s minimum, or 20s for longer games
    const bufferSeconds = Math.max(18, Math.min(20, gameDurationSeconds * 0.25));
    const maxTriggerElapsed = Math.min(
      gameDurationSeconds * config.triggerPercentageMax,
      gameDurationSeconds - bufferSeconds
    );

    // Ensure we have a valid window
    if (maxTriggerElapsed <= minTriggerElapsed) {
      return;
    }

    const randomElapsed =
      minTriggerElapsed + Math.random() * (maxTriggerElapsed - minTriggerElapsed);

    // Convert to "remaining time" for easier comparison
    const triggerTimeRemaining = gameDurationSeconds - randomElapsed;
    triggerTimeRef.current = Math.max(0, triggerTimeRemaining);
  }, [enabled, gameDurationSeconds, config]);

  // Generate new grid for fire round
  const generateNewGrid = useCallback(() => {
    const difficultyConfig = DIFFICULTIES[difficulty] || DIFFICULTIES.MEDIUM;
    const newGrid = generateRandomTable(
      difficultyConfig.rows,
      difficultyConfig.cols,
      language,
      [] // Empty array - let it generate random words to embed
    );

    return { grid: newGrid, embeddedWords: [] };
  }, [difficulty, language]);

  // Execute the full earthquake sequence (warning → shake → fire round)
  // Defined before triggerEarthquake since it's used by triggerEarthquake
  const executeEarthquakeSequence = useCallback(() => {
    // Phase 1: WARNING (2 seconds)
    setEarthquakeState('warning');
    onEarthquakeStart?.();
    onTimerPause?.(); // Pause game timer during warning

    warningTimeoutRef.current = setTimeout(() => {
      // Phase 2: SHAKING (1 second)
      setEarthquakeState('shaking');
      onEarthquakeShake?.();

      shakeTimeoutRef.current = setTimeout(() => {
        // Phase 3: FIRE ROUND (15 seconds)
        const { grid, embeddedWords } = generateNewGrid();
        onGridRegenerate?.(grid, embeddedWords);

        setEarthquakeState('fire-round');
        setFireRoundActive(true);
        setFireRoundRemaining(config.fireRoundDurationSeconds);
        onFireRoundStart?.();

        // Resume game timer AFTER new letters are in place
        onTimerResume?.();

        // Start fire round countdown
        let remaining = config.fireRoundDurationSeconds;
        fireRoundTimerRef.current = setInterval(() => {
          remaining -= 1;
          setFireRoundRemaining(remaining);

          if (remaining <= 0) {
            if (fireRoundTimerRef.current) {
              clearInterval(fireRoundTimerRef.current);
            }
            setEarthquakeState('idle');
            setFireRoundActive(false);
            setFireRoundRemaining(0);
            onFireRoundEnd?.();
          }
        }, 1000);
      }, config.shakeDurationMs);
    }, config.warningDurationMs);
  }, [
    config,
    generateNewGrid,
    onGridRegenerate,
    onEarthquakeStart,
    onEarthquakeShake,
    onFireRoundStart,
    onFireRoundEnd,
    onTimerPause,
    onTimerResume,
  ]);

  // Trigger earthquake sequence
  const triggerEarthquake = useCallback(() => {
    if (earthquakeTriggeredRef.current) {
      return;
    }

    earthquakeTriggeredRef.current = true;

    // For multiplayer hosts, emit socket event instead of executing locally
    if (mode === 'multiplayer' && isHost && socket) {
      const payload: TriggerEarthquakePayload = {
        gameSessionId: String(gameSessionId ?? ''),
        triggerTime: currentTimeSeconds,
      };
      socket.emit('triggerEarthquake', payload);
      return; // Backend will broadcast events back to all players including host
    }

    // Single-player or non-host: Execute earthquake sequence locally
    executeEarthquakeSequence();
  }, [mode, isHost, socket, gameSessionId, currentTimeSeconds, executeEarthquakeSequence]);

  // Monitor time remaining and trigger earthquake at the right moment
  useEffect(() => {
    if (!enabled || earthquakeTriggeredRef.current || triggerTimeRef.current === null) {
      return;
    }

    // Check if we've reached the trigger time
    if (currentTimeSeconds <= triggerTimeRef.current && currentTimeSeconds > 0) {
      triggerEarthquake();
    }
  }, [enabled, currentTimeSeconds, triggerEarthquake]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
      if (fireRoundTimerRef.current) clearInterval(fireRoundTimerRef.current);
    };
  }, []);

  // Get score multiplier (2x during fire round, 1x otherwise)
  const getScoreMultiplier = useCallback((): number => {
    return fireRoundActive ? config.scoreMultiplier : 1;
  }, [fireRoundActive, config.scoreMultiplier]);

  // Force earthquake (for testing/debugging)
  const forceEarthquake = useCallback(() => {
    earthquakeTriggeredRef.current = false; // Reset flag
    triggerEarthquake();
  }, [triggerEarthquake]);

  return {
    earthquakeState,
    fireRoundActive,
    fireRoundRemaining,
    getScoreMultiplier,
    forceEarthquake,
  };
}
