import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { generateRandomTable } from '@/utils/utils';
import { DIFFICULTIES } from '@/utils/consts';
import type {
  EarthquakeState,
  UseEarthquakeFireRoundOptions,
  UseEarthquakeFireRoundReturn,
  EarthquakeConfig,
  TriggerEarthquakePayload,
} from '@/shared/types/earthquake';
import { DEFAULT_EARTHQUAKE_CONFIG } from '@/shared/types/earthquake';

/**
 * useEarthquakeFireRound
 *
 * Manages earthquake/fire round feature for both single-player and multiplayer modes.
 *
 * Features:
 * - Triggers randomly in last 20% of game (80-100% elapsed)
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

  // Calculate trigger time (random time in last 20% of game)
  useEffect(() => {
    if (!enabled || triggerTimeRef.current !== null) return;

    // Don't trigger for very short games
    if (gameDurationSeconds < config.minGameDurationSeconds) {
      console.log('[Earthquake] Game too short, earthquake disabled');
      return;
    }

    // Calculate random trigger time between 80-100% of game elapsed
    const minTriggerElapsed = gameDurationSeconds * config.triggerPercentageMin;
    const maxTriggerElapsed = gameDurationSeconds * config.triggerPercentageMax;
    const randomElapsed =
      minTriggerElapsed + Math.random() * (maxTriggerElapsed - minTriggerElapsed);

    // Convert to "remaining time" for easier comparison
    const triggerTimeRemaining = gameDurationSeconds - randomElapsed;
    triggerTimeRef.current = Math.max(0, triggerTimeRemaining);

    console.log(
      `[Earthquake] Trigger calculated: ${triggerTimeRef.current.toFixed(1)}s remaining (${((randomElapsed / gameDurationSeconds) * 100).toFixed(1)}% elapsed)`
    );
  }, [enabled, gameDurationSeconds, config]);

  // Generate new grid for fire round
  const generateNewGrid = useCallback(() => {
    const difficultyConfig = DIFFICULTIES[difficulty] || DIFFICULTIES.medium;
    const newGrid = generateRandomTable(
      difficultyConfig.rows,
      difficultyConfig.cols,
      language,
      [] // Empty array - let it generate random words to embed
    );

    console.log('[Earthquake] Generated new grid for fire round');
    return { grid: newGrid, embeddedWords: [] };
  }, [difficulty, language]);

  // Trigger earthquake sequence
  const triggerEarthquake = useCallback(() => {
    if (earthquakeTriggeredRef.current) {
      console.warn('[Earthquake] Already triggered, ignoring duplicate trigger');
      return;
    }

    earthquakeTriggeredRef.current = true;
    console.log('[Earthquake] Triggering earthquake sequence');

    // For multiplayer hosts, emit socket event instead of executing locally
    if (mode === 'multiplayer' && isHost && socket) {
      const payload: TriggerEarthquakePayload = {
        gameSessionId: gameSessionId || '',
        triggerTime: currentTimeSeconds,
      };
      console.log('[Earthquake] Host emitting triggerEarthquake event', payload);
      socket.emit('triggerEarthquake', payload);
      return; // Backend will broadcast events back to all players including host
    }

    // Single-player or non-host: Execute earthquake sequence locally
    executeEarthquakeSequence();
  }, [mode, isHost, socket, gameSessionId, currentTimeSeconds]);

  // Execute the full earthquake sequence (warning → shake → fire round)
  const executeEarthquakeSequence = useCallback(() => {
    console.log('[Earthquake] Starting sequence: WARNING phase');

    // Phase 1: WARNING (2 seconds)
    setEarthquakeState('warning');
    onEarthquakeStart?.();

    warningTimeoutRef.current = setTimeout(() => {
      console.log('[Earthquake] SHAKE phase');

      // Phase 2: SHAKING (1 second)
      setEarthquakeState('shaking');
      onEarthquakeShake?.();

      shakeTimeoutRef.current = setTimeout(() => {
        console.log('[Earthquake] FIRE ROUND phase');

        // Phase 3: FIRE ROUND (15 seconds)
        const { grid, embeddedWords } = generateNewGrid();
        onGridRegenerate?.(grid, embeddedWords);

        setEarthquakeState('fire-round');
        setFireRoundActive(true);
        setFireRoundRemaining(config.fireRoundDurationSeconds);
        onFireRoundStart?.();

        // Start fire round countdown
        let remaining = config.fireRoundDurationSeconds;
        fireRoundTimerRef.current = setInterval(() => {
          remaining -= 1;
          setFireRoundRemaining(remaining);

          if (remaining <= 0) {
            console.log('[Earthquake] Fire round ended');
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
  ]);

  // Monitor time remaining and trigger earthquake at the right moment
  useEffect(() => {
    if (!enabled || earthquakeTriggeredRef.current || triggerTimeRef.current === null) {
      return;
    }

    // Check if we've reached the trigger time
    if (currentTimeSeconds <= triggerTimeRef.current && currentTimeSeconds > 0) {
      console.log(
        `[Earthquake] Trigger condition met! Current: ${currentTimeSeconds}s, Trigger: ${triggerTimeRef.current}s`
      );
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
    console.log('[Earthquake] Force trigger requested');
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
