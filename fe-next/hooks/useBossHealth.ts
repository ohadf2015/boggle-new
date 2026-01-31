/**
 * Boss Health Hook
 *
 * Manages boss HP tracking, damage calculation, and phase transitions
 * for Adventure Mode boss battles.
 *
 * Phase Flow:
 * - intro: Pre-battle cutscene (no damage)
 * - active: Normal gameplay (HP > 25%)
 * - enraged: Boss below 25% HP (mechanics intensify)
 * - victory: Player defeated boss (HP = 0)
 * - defeat: Player lost (timer expired)
 *
 * @deprecated This hook is deprecated in favor of `useBossStateMachine` from
 * `@/lib/adventure/boss/useBossStateMachine`. The new state machine provides:
 * - XState-powered state management with clear phase transitions
 * - 3-segment HP tracking (phase1 -> phase2 -> enraged)
 * - Built-in ability trigger integration
 * - Attack telegraph timing
 * - Cinematic coordination for intro/victory/defeat
 *
 * Migration: Replace useBossHealth with useBossStateMachine and update
 * components to use the new state machine API. See BossOverlay.tsx for
 * integration example.
 *
 * This hook will be removed in a future release.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type {
  BossPhase,
  BossHealthState,
  UseBossHealthReturn,
} from '../types/boss';

/**
 * Hook for managing boss health and battle phases
 *
 * @param maxHP - Maximum HP for this boss battle
 * @returns Boss health state and control functions
 */
export function useBossHealth(maxHP: number): UseBossHealthReturn {
  // Emit deprecation warning (only once per component instance, only in development)
  const hasWarnedRef = useRef(false);
  useEffect(() => {
    if (!hasWarnedRef.current && process.env.NODE_ENV === 'development') {
      hasWarnedRef.current = true;
      console.warn(
        '[DEPRECATED] useBossHealth is deprecated. ' +
          'Use useBossStateMachine from @/lib/adventure/boss/useBossStateMachine instead. ' +
          'See BossOverlay.tsx for integration example.'
      );
    }
  }, []);

  // State: Boss health tracking
  const [currentHP, setCurrentHP] = useState<number>(maxHP);
  const [phase, setPhase] = useState<BossPhase>('intro');
  const [totalDamageDealt, setTotalDamageDealt] = useState<number>(0);

  // Ref to avoid closure issues in dealDamage callback
  const phaseRef = useRef<BossPhase>(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  /**
   * Calculate HP as percentage (0-100)
   */
  const hpPercentage = useMemo(() => {
    if (maxHP === 0) return 0;
    return Math.round((currentHP / maxHP) * 100);
  }, [currentHP, maxHP]);

  /**
   * Check if boss is enraged (below 25% HP)
   */
  const isEnraged = useMemo(() => {
    return hpPercentage < 25;
  }, [hpPercentage]);

  /**
   * Check if battle is active (not in intro/victory/defeat)
   */
  const isActive = useMemo(() => {
    return phase === 'active' || phase === 'enraged';
  }, [phase]);

  /**
   * Start the boss battle (transition from intro to active)
   */
  const startBattle = useCallback(() => {
    setPhase('active');
    phaseRef.current = 'active'; // Update ref immediately for same-render calls
  }, []);

  /**
   * Deal damage to the boss
   *
   * @param baseDamage - Base damage before multipliers
   * @param comboCount - Current combo count (from Phase 15)
   * @param mechanicMultiplier - Multiplier from boss mechanic bonus
   * @param comboBonus - Bonus from skill effects (e.g., combo_amplifier adds 0.25)
   * @returns Actual damage dealt (0 if battle not active)
   */
  const dealDamage = useCallback(
    (baseDamage: number, comboCount: number, mechanicMultiplier: number, comboBonus: number = 0): number => {
      // Use ref to get current phase (avoids closure issues)
      const currentPhase = phaseRef.current;

      // Don't deal damage if battle is not active
      if (currentPhase !== 'active' && currentPhase !== 'enraged') {
        return 0;
      }

      // Calculate total damage with multipliers
      // Combo multiplier: 1 + (comboCount * 0.1) + comboBonus (from skill effects)
      const comboMultiplier = 1 + (comboCount * 0.1) + comboBonus;
      const totalDamage = Math.round(baseDamage * comboMultiplier * mechanicMultiplier);

      // Update HP using functional form to ensure we have latest value
      setCurrentHP((prevHP) => {
        const newHP = Math.max(0, prevHP - totalDamage);

        // Determine phase transitions based on new HP
        if (newHP === 0) {
          setPhase('victory');
          phaseRef.current = 'victory'; // Update ref immediately
        } else if (newHP <= maxHP * 0.25 && currentPhase === 'active') {
          setPhase('enraged');
          phaseRef.current = 'enraged'; // Update ref immediately
        }

        return newHP;
      });

      // Track total damage dealt
      setTotalDamageDealt((prev) => prev + totalDamage);

      return totalDamage;
    },
    [maxHP]
  );

  /**
   * End the battle (called when timer expires or player wins manually)
   *
   * @param isVictory - Whether player won (true) or lost (false)
   */
  const endBattle = useCallback((isVictory: boolean) => {
    const newPhase = isVictory ? 'victory' : 'defeat';
    setPhase(newPhase);
    phaseRef.current = newPhase; // Update ref immediately
  }, []);

  /**
   * Reset boss health to initial state
   */
  const resetHealth = useCallback(() => {
    setCurrentHP(maxHP);
    setPhase('intro');
    phaseRef.current = 'intro'; // Update ref immediately
    setTotalDamageDealt(0);
  }, [maxHP]);

  // Construct health state object
  const healthState: BossHealthState = {
    currentHP,
    maxHP,
    phase,
    totalDamageDealt,
    isActive,
  };

  return {
    healthState,
    dealDamage,
    startBattle,
    endBattle,
    resetHealth,
    hpPercentage,
    isEnraged,
  };
}
