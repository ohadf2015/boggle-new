/**
 * Combo System Utilities
 * Shared logic for combo window calculation, timeout, and reset
 */
import type { MutableRefObject } from 'react';

// ==================== Constants ====================

/** Base combo chain window in milliseconds */
export const COMBO_BASE_WINDOW_MS = 6000;

/** Bonus time per combo level in milliseconds */
export const COMBO_LEVEL_BONUS_MS = 1000;

/** Maximum combo window in milliseconds */
export const COMBO_MAX_WINDOW_MS = 12000;

/** Number of valid words required to earn one combo shield */
export const VALID_WORDS_PER_SHIELD = 10;

// ==================== Types ====================

export interface ComboRefs {
  comboLevelRef: MutableRefObject<number>;
  lastWordTimeRef: MutableRefObject<number | null>;
  comboTimeoutRef: MutableRefObject<NodeJS.Timeout | null>;
}

export interface ComboSetters {
  setComboLevel: React.Dispatch<React.SetStateAction<number>>;
  setLastWordTime: React.Dispatch<React.SetStateAction<number | null>>;
}

export interface ComboShieldRefs {
  comboShieldsUsedRef: MutableRefObject<number>;
}

// ==================== Core Functions ====================

/**
 * Calculate the combo chain window based on current combo level
 * Window increases with level but caps at maximum
 */
export function calculateComboChainWindow(currentComboLevel: number): number {
  return Math.min(
    COMBO_BASE_WINDOW_MS + currentComboLevel * COMBO_LEVEL_BONUS_MS,
    COMBO_MAX_WINDOW_MS
  );
}

/**
 * Calculate the combo timeout duration based on new combo level
 */
export function calculateComboTimeout(newComboLevel: number): number {
  return Math.min(
    COMBO_BASE_WINDOW_MS + newComboLevel * COMBO_LEVEL_BONUS_MS,
    COMBO_MAX_WINDOW_MS
  );
}

/**
 * Calculate available combo shields based on valid words found
 */
export function calculateAvailableShields(
  validWordCount: number,
  shieldsUsed: number
): number {
  const totalShields = Math.floor(validWordCount / VALID_WORDS_PER_SHIELD);
  return Math.max(0, totalShields - shieldsUsed);
}

/**
 * Reset combo state to initial values
 */
export function resetComboState(
  refs: ComboRefs,
  setters: ComboSetters
): void {
  setters.setComboLevel(0);
  refs.comboLevelRef.current = 0;
  setters.setLastWordTime(null);
  refs.lastWordTimeRef.current = null;
  if (refs.comboTimeoutRef.current) {
    clearTimeout(refs.comboTimeoutRef.current);
    refs.comboTimeoutRef.current = null;
  }
}

/**
 * Process a word acceptance and update combo state
 * Returns the new combo level
 */
export function processComboOnWordAccepted(
  autoValidated: boolean,
  refs: ComboRefs,
  setters: ComboSetters,
  playComboSound?: (level: number) => void
): number {
  const now = Date.now();

  if (!autoValidated) {
    // Word was not in dictionary - don't continue combo
    return refs.comboLevelRef.current;
  }

  const currentComboLevel = refs.comboLevelRef.current;
  const currentLastWordTime = refs.lastWordTimeRef.current;
  const comboChainWindow = calculateComboChainWindow(currentComboLevel);

  let newComboLevel = 0;

  if (!currentLastWordTime) {
    // First word of the session - start combo at 1
    newComboLevel = 1;
    setters.setComboLevel(newComboLevel);
    refs.comboLevelRef.current = newComboLevel;
  } else if ((now - currentLastWordTime) < comboChainWindow) {
    // Within combo window - increment combo
    newComboLevel = currentComboLevel + 1;
    setters.setComboLevel(newComboLevel);
    refs.comboLevelRef.current = newComboLevel;
    playComboSound?.(newComboLevel);
  } else {
    // Outside window - reset to 1 (this word starts a new chain)
    newComboLevel = 1;
    setters.setComboLevel(newComboLevel);
    refs.comboLevelRef.current = newComboLevel;
  }

  // Update last word time
  setters.setLastWordTime(now);
  refs.lastWordTimeRef.current = now;

  // Clear existing timeout
  if (refs.comboTimeoutRef.current) {
    clearTimeout(refs.comboTimeoutRef.current);
  }

  // Set new timeout to reset combo
  const comboTimeout = calculateComboTimeout(newComboLevel);
  refs.comboTimeoutRef.current = setTimeout(() => {
    setters.setComboLevel(0);
    refs.comboLevelRef.current = 0;
    setters.setLastWordTime(null);
    refs.lastWordTimeRef.current = null;
  }, comboTimeout);

  return newComboLevel;
}

/**
 * Create a reset combo function with optional shield protection
 */
export function createResetComboWithShields(
  refs: ComboRefs & ComboShieldRefs,
  setters: ComboSetters,
  getValidWordCount: () => number,
  onShieldUsed?: () => void
): () => void {
  return () => {
    const currentCombo = refs.comboLevelRef.current;

    // Only use shield if we have an active combo worth protecting
    if (currentCombo > 0) {
      const availableShields = calculateAvailableShields(
        getValidWordCount(),
        refs.comboShieldsUsedRef.current
      );

      if (availableShields > 0) {
        refs.comboShieldsUsedRef.current += 1;
        onShieldUsed?.();
        return; // Don't reset combo
      }
    }

    // No shield available or no combo to protect - reset normally
    resetComboState(refs, setters);
  };
}
