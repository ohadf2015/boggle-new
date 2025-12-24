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
  VALID_WORDS_PER_SHIELD,
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

export function useComboSystem(options: UseComboSystemOptions = {}): ComboSystemReturn {
  const {
    enableShields = false,
    onComboChange,
    onComboSound,
    onShieldUsed,
    trackMaxCombo = true,
  } = options;

  // State
  const [comboLevel, setComboLevel] = useState(0);
  const [lastWordTime, setLastWordTime] = useState<number | null>(null);
  const [validWordCount, setValidWordCount] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [shieldsUsed, setShieldsUsed] = useState(0);

  // Refs for accessing current values in callbacks (no stale closures)
  const comboLevelRef = useRef(0);
  const lastWordTimeRef = useRef<number | null>(null);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const validWordCountRef = useRef(0);
  const shieldsUsedRef = useRef(0);

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

  // Calculate available shields
  const availableShields = useMemo(() => {
    if (!enableShields) return 0;
    return calculateAvailableShields(validWordCount, shieldsUsed);
  }, [enableShields, validWordCount, shieldsUsed]);

  // Internal reset function (no shield check)
  const internalReset = useCallback(() => {
    setComboLevel(0);
    comboLevelRef.current = 0;
    setLastWordTime(null);
    lastWordTimeRef.current = null;
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
      comboTimeoutRef.current = null;
    }
  }, []);

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
    internalReset();
  }, [enableShields, internalReset, onShieldUsed]);

  /**
   * Force reset combo without shield protection
   */
  const forceResetCombo = useCallback(() => {
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

    let newComboLevel = 0;

    if (currentLastWordTime && (now - currentLastWordTime) < comboChainWindow) {
      // Within combo window - increment combo
      newComboLevel = currentComboLevel + 1;
    }
    // If outside window or first word, newComboLevel stays 0

    // Update state
    setComboLevel(newComboLevel);
    comboLevelRef.current = newComboLevel;
    setLastWordTime(now);
    lastWordTimeRef.current = now;

    // Play combo sound if level > 0
    if (newComboLevel > 0) {
      onComboSound?.(newComboLevel);
    }

    // Clear existing timeout
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }

    // Set new timeout to reset combo after window expires
    const comboTimeout = calculateComboTimeout(newComboLevel);
    comboTimeoutRef.current = setTimeout(() => {
      setComboLevel(0);
      comboLevelRef.current = 0;
      setLastWordTime(null);
      lastWordTimeRef.current = null;
    }, comboTimeout);

    return newComboLevel;
  }, [onComboSound]);

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
    internalReset();
    setValidWordCount(0);
    validWordCountRef.current = 0;
    setMaxCombo(0);
    setShieldsUsed(0);
    shieldsUsedRef.current = 0;
  }, [internalReset]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
      }
    };
  }, []);

  return {
    comboLevel,
    comboLevelRef,
    maxCombo,
    availableShields,
    validWordCount,
    incrementCombo,
    resetCombo,
    forceResetCombo,
    incrementValidWordCount,
    resetAll,
  };
}

export default useComboSystem;
