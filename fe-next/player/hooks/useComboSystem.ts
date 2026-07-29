/**
 * useComboSystem - Combo chain and shield management hook
 *
 * Extracts the combo system logic from PlayerView, managing:
 * - Combo level tracking with automatic decay
 * - Combo shield system (earned every 10 valid words)
 * - Sound effects integration
 */

import { useState, useCallback, useRef, useMemo, MutableRefObject } from 'react';
import {
  COMBO_BASE_WINDOW_MS,
  COMBO_LEVEL_BONUS_MS as COMBO_WINDOW_INCREMENT_MS,
  COMBO_MAX_WINDOW_MS,
  VALID_WORDS_PER_SHIELD,
} from '@/shared/utils/comboUtils';

// ==========================================
// Types
// ==========================================

export interface ComboState {
  level: number;
  lastWordTime: number | null;
  shieldsUsed: number;
}

export interface ComboRefs {
  levelRef: MutableRefObject<number>;
  lastWordTimeRef: MutableRefObject<number | null>;
  timeoutRef: MutableRefObject<NodeJS.Timeout | null>;
  shieldsUsedRef: MutableRefObject<number>;
}

export interface ComboActions {
  /** Increment combo on valid word (auto-validated only) */
  incrementCombo: () => number;

  /** Reset combo (can be protected by shield) */
  resetCombo: (options?: { forceReset?: boolean }) => boolean;

  /** Check available shields based on valid word count */
  getAvailableShields: () => number;

  /** Reset combo for new game */
  resetForNewGame: () => void;

  /** Get current combo window in ms */
  getComboWindow: () => number;
}

export interface UseComboSystemOptions {
  /** Callback to play combo sound */
  playComboSound?: (level: number) => void;

  /** Callback when shield is used */
  onShieldUsed?: () => void;

  /** Function to get valid word count for shield calculation */
  getValidWordCount: () => number;
}

export interface UseComboSystemReturn {
  state: ComboState;
  refs: ComboRefs;
  actions: ComboActions;
}

// ==========================================
// Hook Implementation
// ==========================================

export function useComboSystem(options: UseComboSystemOptions): UseComboSystemReturn {
  const { playComboSound, onShieldUsed, getValidWordCount } = options;

  // State
  const [level, setLevel] = useState<number>(0);
  const [lastWordTime, setLastWordTime] = useState<number | null>(null);
  const [shieldsUsed, setShieldsUsed] = useState<number>(0);

  // Refs (for use in callbacks to avoid stale closures)
  const levelRef = useRef<number>(0);
  const lastWordTimeRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shieldsUsedRef = useRef<number>(0);

  // Keep refs in sync
  levelRef.current = level;
  lastWordTimeRef.current = lastWordTime;
  shieldsUsedRef.current = shieldsUsed;

  // Calculate combo window based on current level
  const getComboWindow = useCallback((): number => {
    return Math.min(
      COMBO_BASE_WINDOW_MS + levelRef.current * COMBO_WINDOW_INCREMENT_MS,
      COMBO_MAX_WINDOW_MS
    );
  }, []);

  // Calculate available shields
  const getAvailableShields = useCallback((): number => {
    const validWordCount = getValidWordCount();
    const totalShields = Math.floor(validWordCount / VALID_WORDS_PER_SHIELD);
    return Math.max(0, totalShields - shieldsUsedRef.current);
  }, [getValidWordCount]);

  // Reset combo (with optional shield protection)
  const resetCombo = useCallback((options?: { forceReset?: boolean }): boolean => {
    const currentLevel = levelRef.current;
    const forceReset = options?.forceReset ?? false;

    // Only try to use shield if we have an active combo worth protecting
    if (!forceReset && currentLevel > 0) {
      const availableShields = getAvailableShields();

      if (availableShields > 0) {
        // Use a shield instead of resetting
        setShieldsUsed(prev => prev + 1);
        shieldsUsedRef.current += 1;
        onShieldUsed?.();
        return false; // Combo was NOT reset (shield used)
      }
    }

    // Reset combo
    setLevel(0);
    levelRef.current = 0;
    setLastWordTime(null);
    lastWordTimeRef.current = null;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    return true; // Combo was reset
  }, [getAvailableShields, onShieldUsed]);

  // Increment combo on valid word
  const incrementCombo = useCallback((): number => {
    const now = Date.now();
    const currentLevel = levelRef.current;
    const currentLastTime = lastWordTimeRef.current;

    // Calculate if we're within the combo window
    const comboWindow = getComboWindow();
    const isWithinWindow = currentLastTime && (now - currentLastTime) < comboWindow;

    let newLevel: number;
    if (isWithinWindow) {
      newLevel = currentLevel + 1;
    } else {
      newLevel = 1; // Every accepted word starts a new chain
    }

    // Update state
    setLevel(newLevel);
    levelRef.current = newLevel;
    setLastWordTime(now);
    lastWordTimeRef.current = now;

    // Play sound
    if (newLevel > 0) {
      playComboSound?.(newLevel);
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new decay timeout based on new level
    const newComboWindow = Math.min(
      COMBO_BASE_WINDOW_MS + newLevel * COMBO_WINDOW_INCREMENT_MS,
      COMBO_MAX_WINDOW_MS
    );

    timeoutRef.current = setTimeout(() => {
      setLevel(0);
      levelRef.current = 0;
      setLastWordTime(null);
      lastWordTimeRef.current = null;
    }, newComboWindow);

    return newLevel;
  }, [getComboWindow, playComboSound]);

  // Reset for new game
  const resetForNewGame = useCallback(() => {
    setLevel(0);
    levelRef.current = 0;
    setLastWordTime(null);
    lastWordTimeRef.current = null;
    setShieldsUsed(0);
    shieldsUsedRef.current = 0;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Memoized state object
  const state = useMemo<ComboState>(() => ({
    level,
    lastWordTime,
    shieldsUsed,
  }), [level, lastWordTime, shieldsUsed]);

  // Memoized refs object
  const refs = useMemo<ComboRefs>(() => ({
    levelRef,
    lastWordTimeRef,
    timeoutRef,
    shieldsUsedRef,
  }), []);

  // Memoized actions object
  const actions = useMemo<ComboActions>(() => ({
    incrementCombo,
    resetCombo,
    getAvailableShields,
    resetForNewGame,
    getComboWindow,
  }), [incrementCombo, resetCombo, getAvailableShields, resetForNewGame, getComboWindow]);

  return { state, refs, actions };
}

export default useComboSystem;
