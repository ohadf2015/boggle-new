/**
 * useComboSystem - Unified combo state management hook
 *
 * Consolidates combo logic from:
 * - SinglePlayerGame.tsx
 * - DailyChallengeGame.tsx
 * - PlayerView.tsx / HostView.tsx (multiplayer)
 *
 * Features:
 * - Automatic ref synchronization (no stale closure bugs)
 * - Combo chain window calculation
 * - Optional shield protection (for multiplayer)
 * - Sound effect integration
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  calculateComboChainWindow,
  calculateComboTimeout,
  calculateAvailableShields,
} from '@/shared/utils/comboUtils';
// ==================== Types ====================

export interface UseComboSystemOptions {
  /** Enable combo shields (multiplayer feature) */
  enableShields?: boolean;
  /** Callback when combo level changes */
  onComboChange?: (level: number) => void;
  /** Sound effect callback */
  onComboSound?: (level: number) => void;
  /** Callback when shield is used */
  onShieldUsed?: () => void;
  /** Track max combo for achievements */
  trackMaxCombo?: boolean;
  /** Callback when combo breaks (lost) - receives the level that was lost */
  onComboBreak?: (lostLevel: number) => void;
  /** Callback when combo is saved just in time (within danger zone) */
  onComboSaved?: () => void;
  /** Callback for milestone celebrations (combo 5, 10, 15) */
  onComboMilestone?: (level: number) => void;
  /** Callback when danger state changes */
  onDangerStateChange?: (isDanger: boolean) => void;
  /** Timer update interval in ms (default 500). Reduced from 250ms to cut CPU wakeups in half while still providing smooth visual feedback for the combo bar. */
  timerIntervalMs?: number;
}

export interface ComboSystemReturn {
  /** Current combo level (0 = no combo) */
  comboLevel: number;
  /** Ref for accessing combo level in callbacks without stale closure */
  comboLevelRef: React.MutableRefObject<number>;
  /** Max combo achieved this session */
  maxCombo: number;
  /** Available shields (if enabled) */
  availableShields: number;
  /** Number of valid words found (for shield calculation) */
  validWordCount: number;
  /** Time remaining as percentage (0-100), null when no active combo */
  comboTimeRemaining: number | null;
  /** Whether combo timer is in danger zone (<30% remaining) */
  isDangerState: boolean;
  /** Increment combo after valid word accepted */
  incrementCombo: (autoValidated?: boolean) => number;
  /** Reset combo to 0 (uses shield if available and enabled) */
  resetCombo: () => void;
  /** Force reset without shield protection */
  forceResetCombo: () => void;
  /** Increment valid word count (for shield tracking) */
  incrementValidWordCount: () => void;
  /** Reset all state (for new game) */
  resetAll: () => void;
}

// ==================== Hook ====================

// Danger state threshold (percentage of time remaining)
const DANGER_THRESHOLD = 30;
// Milestone levels for celebrations
const MILESTONE_LEVELS = [5, 10, 15];

export function useComboSystem(options: UseComboSystemOptions = {}): ComboSystemReturn {
  const {
    enableShields = false,
    onComboChange,
    onComboSound,
    onShieldUsed,
    trackMaxCombo = true,
    onComboBreak,
    onComboSaved,
    onComboMilestone,
    onDangerStateChange,
    timerIntervalMs = 500,
  } = options;

  // State
  const [comboLevel, setComboLevel] = useState(0);
  const [lastWordTime, setLastWordTime] = useState<number | null>(null);
  const [validWordCount, setValidWordCount] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [shieldsUsed, setShieldsUsed] = useState(0);
  const [comboTimeRemaining, setComboTimeRemaining] = useState<number | null>(null);
  const [isDangerState, setIsDangerState] = useState(false);

  // Refs for accessing current values in callbacks (no stale closures)
  const comboLevelRef = useRef(0);
  const lastWordTimeRef = useRef<number | null>(null);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const comboTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const comboWindowDurationRef = useRef<number>(0);
  const validWordCountRef = useRef(0);
  const shieldsUsedRef = useRef(0);
  const wasDangerStateRef = useRef(false);

  // Keep refs in sync with state (consolidated into single effect)
  useEffect(() => {
    comboLevelRef.current = comboLevel;
    lastWordTimeRef.current = lastWordTime;
    validWordCountRef.current = validWordCount;
    shieldsUsedRef.current = shieldsUsed;
  }, [comboLevel, lastWordTime, validWordCount, shieldsUsed]);

  // Track max combo
  useEffect(() => {
    if (trackMaxCombo && comboLevel > maxCombo) {
      setMaxCombo(comboLevel);
    }
  }, [comboLevel, maxCombo, trackMaxCombo]);

  // Notify on combo change
  useEffect(() => {
    onComboChange?.(comboLevel);
  }, [comboLevel, onComboChange]);

  // Notify on danger state change
  useEffect(() => {
    onDangerStateChange?.(isDangerState);
  }, [isDangerState, onDangerStateChange]);

  // Timer interval to update remaining time percentage
  useEffect(() => {
    // Clear any existing interval
    if (comboTimerIntervalRef.current) {
      clearInterval(comboTimerIntervalRef.current);
      comboTimerIntervalRef.current = null;
    }

    // Only track time if we have an active combo
    if (comboLevel > 0 && lastWordTime !== null && comboWindowDurationRef.current > 0) {
      const updateTimeRemaining = () => {
        const now = Date.now();
        const elapsed = now - (lastWordTimeRef.current ?? now);
        const duration = comboWindowDurationRef.current;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);

        setComboTimeRemaining(remaining);

        // Check danger state
        const isNowDanger = remaining <= DANGER_THRESHOLD && remaining > 0;
        if (isNowDanger !== wasDangerStateRef.current) {
          wasDangerStateRef.current = isNowDanger;
          setIsDangerState(isNowDanger);
        }
      };

      // Update immediately and then at configurable rate — 250ms (4Hz) on capable
      // devices, 500ms (2Hz) on low-end to reduce re-renders
      updateTimeRemaining();
      comboTimerIntervalRef.current = setInterval(updateTimeRemaining, timerIntervalMs);
    } else {
      setComboTimeRemaining(null);
      if (isDangerState) {
        setIsDangerState(false);
        wasDangerStateRef.current = false;
      }
    }

    return () => {
      if (comboTimerIntervalRef.current) {
        clearInterval(comboTimerIntervalRef.current);
      }
    };
  }, [comboLevel, lastWordTime, isDangerState, timerIntervalMs]);

  // Calculate available shields
  const availableShields = useMemo(() => {
    if (!enableShields) return 0;
    return calculateAvailableShields(validWordCount, shieldsUsed);
  }, [enableShields, validWordCount, shieldsUsed]);

  // Internal reset function (no shield check)
  const internalReset = useCallback((lostLevel?: number, wasTimeout?: boolean) => {
    // Call break callback if combo was lost (not just a manual reset)
    if (lostLevel !== undefined && lostLevel > 0 && onComboBreak) {
      onComboBreak(lostLevel);
    }

    setComboLevel(0);
    comboLevelRef.current = 0;
    setLastWordTime(null);
    lastWordTimeRef.current = null;
    setComboTimeRemaining(null);
    setIsDangerState(false);
    wasDangerStateRef.current = false;
    comboWindowDurationRef.current = 0;

    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
      comboTimeoutRef.current = null;
    }
    if (comboTimerIntervalRef.current) {
      clearInterval(comboTimerIntervalRef.current);
      comboTimerIntervalRef.current = null;
    }
  }, [onComboBreak]);

  /**
   * Reset combo - uses shield if available and enabled
   */
  const resetCombo = useCallback(() => {
    const currentCombo = comboLevelRef.current;

    // Only use shield if we have an active combo worth protecting
    if (enableShields && currentCombo > 0) {
      const shields = calculateAvailableShields(
        validWordCountRef.current,
        shieldsUsedRef.current
      );

      if (shields > 0) {
        setShieldsUsed(prev => prev + 1);
        shieldsUsedRef.current += 1;
        onShieldUsed?.();
        return; // Don't reset combo
      }
    }

    // No shield available or not enabled - reset normally
    // Pass the current combo level so onComboBreak can be called
    internalReset(currentCombo, false);
  }, [enableShields, internalReset, onShieldUsed]);

  /**
   * Force reset combo without shield protection
   */
  const forceResetCombo = useCallback(() => {
    // Force reset does not trigger break callback (it's intentional reset)
    internalReset();
  }, [internalReset]);

  /**
   * Increment combo after valid word is accepted
   * Returns the new combo level
   */
  const incrementCombo = useCallback((autoValidated: boolean = true): number => {
    const now = Date.now();

    if (!autoValidated) {
      // Word was pending validation (not in dictionary) - don't continue combo
      return comboLevelRef.current;
    }

    const currentComboLevel = comboLevelRef.current;
    const currentLastWordTime = lastWordTimeRef.current;
    const comboChainWindow = calculateComboChainWindow(currentComboLevel);
    const wasDanger = wasDangerStateRef.current;

    let newComboLevel = 1; // Every accepted word starts or continues a chain

    if (currentLastWordTime && (now - currentLastWordTime) < comboChainWindow) {
      // Within combo window - increment combo
      newComboLevel = currentComboLevel + 1;

      // If we were in danger state and just saved the combo, trigger callback
      if (wasDanger && onComboSaved) {
        onComboSaved();
      }
    }
    // If outside window or first word, newComboLevel stays 1 (new chain)

    // Update state
    setComboLevel(newComboLevel);
    comboLevelRef.current = newComboLevel;
    setLastWordTime(now);
    lastWordTimeRef.current = now;

    // Reset danger state since we just got a new word
    setIsDangerState(false);
    wasDangerStateRef.current = false;

    // Play combo sound if level > 0
    if (newComboLevel > 0) {
      onComboSound?.(newComboLevel);

      // Check for milestone (5, 10, 15)
      if (MILESTONE_LEVELS.includes(newComboLevel) && onComboMilestone) {
        onComboMilestone(newComboLevel);
      }
    }

    // Clear existing timeout and interval
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }

    // Set new timeout to reset combo after window expires
    const comboTimeout = calculateComboTimeout(newComboLevel);
    comboWindowDurationRef.current = comboTimeout;

    comboTimeoutRef.current = setTimeout(() => {
      const lostLevel = comboLevelRef.current;
      // Trigger break callback for timeout expiry
      if (lostLevel > 0 && onComboBreak) {
        onComboBreak(lostLevel);
      }
      setComboLevel(0);
      comboLevelRef.current = 0;
      setLastWordTime(null);
      lastWordTimeRef.current = null;
      setComboTimeRemaining(null);
      setIsDangerState(false);
      wasDangerStateRef.current = false;
      comboWindowDurationRef.current = 0;
    }, comboTimeout);

    return newComboLevel;
  }, [onComboSound, onComboSaved, onComboMilestone, onComboBreak]);

  /**
   * Increment valid word count (for shield calculation)
   */
  const incrementValidWordCount = useCallback(() => {
    setValidWordCount(prev => prev + 1);
  }, []);

  /**
   * Reset all state for new game
   */
  const resetAll = useCallback(() => {
    // Don't trigger break callback for game reset
    internalReset();
    setValidWordCount(0);
    validWordCountRef.current = 0;
    setMaxCombo(0);
    setShieldsUsed(0);
    shieldsUsedRef.current = 0;
  }, [internalReset]);

  // Cleanup timeout and interval on unmount
  useEffect(() => {
    return () => {
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
      }
      if (comboTimerIntervalRef.current) {
        clearInterval(comboTimerIntervalRef.current);
      }
    };
  }, []);

  return {
    comboLevel,
    comboLevelRef,
    maxCombo,
    availableShields,
    validWordCount,
    comboTimeRemaining,
    isDangerState,
    incrementCombo,
    resetCombo,
    forceResetCombo,
    incrementValidWordCount,
    resetAll,
  };
}

export default useComboSystem;
