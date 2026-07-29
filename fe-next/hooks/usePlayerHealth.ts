/**
 * Player Health Hook
 *
 * Manages player HP tracking, damage from boss attacks, healing,
 * and death state for Adventure Mode boss battles.
 *
 * States:
 * - Normal: HP > 25%
 * - Low Health: HP <= 25% but > 0
 * - Dead: HP = 0
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

// ==============================================
// TYPES
// ==============================================

export interface PlayerHealthState {
  /** Current HP value */
  currentHP: number;
  /** Maximum HP value */
  maxHP: number;
  /** Whether player is dead (HP = 0) */
  isDead: boolean;
  /** Whether player is in low health state (HP < 25%) */
  isLowHealth: boolean;
  /** Total damage taken this battle */
  totalDamageTaken: number;
}

export interface UsePlayerHealthReturn {
  /** Current health state */
  healthState: PlayerHealthState;
  /** Deal damage to player, returns actual damage dealt */
  takeDamage: (amount: number) => number;
  /** Heal player, returns actual healing done */
  heal: (amount: number) => number;
  /** Reset health to max */
  resetHealth: () => void;
  /** HP as percentage (0-100) */
  hpPercentage: number;
  /** Dynamically change max HP */
  setMaxHP: (newMax: number) => void;
}

// ==============================================
// CONSTANTS
// ==============================================

/** Default max HP for player */
const DEFAULT_MAX_HP = 100;

/** Threshold for low health warning (percentage) */
const LOW_HEALTH_THRESHOLD = 25;

// ==============================================
// HOOK
// ==============================================

/**
 * Hook for managing player health in boss battles
 *
 * @param initialMaxHP - Maximum HP for the player (default: 100)
 * @returns Player health state and control functions
 */
export function usePlayerHealth(initialMaxHP: number = DEFAULT_MAX_HP): UsePlayerHealthReturn {
  // State: Player health tracking
  const [currentHP, setCurrentHP] = useState<number>(initialMaxHP);
  const [maxHP, setMaxHPState] = useState<number>(initialMaxHP);
  const [totalDamageTaken, setTotalDamageTaken] = useState<number>(0);

  // Refs for synchronous access in callbacks (avoids React batching issues)
  const currentHPRef = useRef<number>(initialMaxHP);
  const maxHPRef = useRef<number>(initialMaxHP);
  const totalDamageTakenRef = useRef<number>(0);

  // Sync refs with state (combined into single effect for efficiency)
  useEffect(() => {
    currentHPRef.current = currentHP;
    maxHPRef.current = maxHP;
    totalDamageTakenRef.current = totalDamageTaken;
  }, [currentHP, maxHP, totalDamageTaken]);

  // Derived values - simple calculations don't need useMemo
  const hpPercentage = maxHP === 0 ? 0 : Math.round((currentHP / maxHP) * 100);
  const isLowHealth = currentHP > 0 && hpPercentage < LOW_HEALTH_THRESHOLD;
  const isDead = currentHP === 0;

  /**
   * Deal damage to the player
   *
   * @param amount - Amount of damage to deal
   * @returns Actual damage dealt (may be less if player doesn't have enough HP)
   */
  const takeDamage = useCallback((amount: number): number => {
    // Don't deal damage to dead player (use ref for synchronous check)
    if (currentHPRef.current === 0) {
      return 0;
    }

    // Calculate actual damage (capped by remaining HP)
    const actualDamage = Math.min(amount, currentHPRef.current);
    const newHP = currentHPRef.current - actualDamage;

    // Update ref immediately for synchronous access
    currentHPRef.current = newHP;

    // Update state
    setCurrentHP(newHP);

    // Track total damage (update ref and state)
    const newTotal = totalDamageTakenRef.current + actualDamage;
    totalDamageTakenRef.current = newTotal;
    setTotalDamageTaken(newTotal);

    return actualDamage;
  }, []);

  /**
   * Heal the player
   *
   * @param amount - Amount of healing
   * @returns Actual healing done (may be less if would exceed max HP)
   */
  const heal = useCallback((amount: number): number => {
    // Can't heal dead player (use ref for synchronous check)
    if (currentHPRef.current === 0) {
      return 0;
    }

    // Calculate actual healing (capped by max HP)
    const actualHealing = Math.min(amount, maxHPRef.current - currentHPRef.current);
    const newHP = currentHPRef.current + actualHealing;

    // Update ref immediately for synchronous access
    currentHPRef.current = newHP;

    // Update state
    setCurrentHP(newHP);

    return actualHealing;
  }, []);

  /**
   * Reset health to max
   */
  const resetHealth = useCallback(() => {
    // Update refs immediately
    currentHPRef.current = maxHPRef.current;
    totalDamageTakenRef.current = 0;

    // Update state
    setCurrentHP(maxHPRef.current);
    setTotalDamageTaken(0);
  }, []);

  /**
   * Dynamically change max HP
   * If new max is lower than current HP, caps current HP at new max
   */
  const setMaxHP = useCallback((newMax: number) => {
    // Update refs immediately
    maxHPRef.current = newMax;
    if (currentHPRef.current > newMax) {
      currentHPRef.current = newMax;
    }

    // Update state
    setMaxHPState(newMax);
    setCurrentHP((prevHP) => Math.min(prevHP, newMax));
  }, []);

  // Construct health state object — memoized to prevent re-render cascades
  const healthState: PlayerHealthState = useMemo(() => ({
    currentHP,
    maxHP,
    isDead,
    isLowHealth,
    totalDamageTaken,
  }), [currentHP, maxHP, isDead, isLowHealth, totalDamageTaken]);

  return {
    healthState,
    takeDamage,
    heal,
    resetHealth,
    hpPercentage,
    setMaxHP,
  };
}
