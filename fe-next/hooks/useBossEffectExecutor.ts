/**
 * Boss Effect Executor Hook
 *
 * Applies boss ability effects to game state by calling provided callbacks.
 * Handles effect timing, cleanup, and visual feedback triggers.
 *
 * Effects supported:
 * - player_damage: Deal damage to player health
 * - timer_penalty: Reduce game timer
 * - lock_tiles: Temporarily lock specific tiles
 * - scramble: Shuffle the game board
 * - change_tiles: Modify tile letters/types
 * - spawn_special: Add special tiles to board
 * - requirement: Force specific word requirements
 * - score_modifier: Change scoring temporarily
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { AbilityEffect, AbilityTarget } from '../types/bossAbility';

// ==============================================
// TYPES
// ==============================================

/**
 * Callbacks for game state modifications
 */
export interface EffectCallbacks {
  /** Deal damage to player (amount) */
  onPlayerDamage?: (amount: number) => void;
  /** Reduce timer by seconds */
  onTimerPenalty?: (seconds: number) => void;
  /** Lock specific tiles (indices, durationMs) */
  onLockTiles?: (indices: number[], durationMs: number) => void;
  /** Unlock specific tiles */
  onUnlockTiles?: (indices: number[]) => void;
  /** Scramble the board */
  onScramble?: () => void;
  /** Trigger screen shake effect */
  onScreenShake?: (intensity?: number) => void;
  /** Trigger damage flash overlay */
  onDamageFlash?: () => void;
  /** Change specific tiles */
  onChangeTiles?: (indices: number[], newLetters: string[]) => void;
  /** Spawn special tiles */
  onSpawnSpecial?: (type: string, count: number) => void;
  /** Set active word requirement */
  onRequirement?: (requirement: string, duration: number) => void;
  /** Apply score modifier */
  onScoreModifier?: (multiplier: number, duration: number) => void;
}

/**
 * Active effect with expiration tracking
 */
interface ActiveEffect {
  /** Original effect data */
  effect: AbilityEffect;
  /** When effect was applied */
  appliedAt: number;
  /** When effect expires (null = permanent) */
  expiresAt: number | null;
  /** Tiles affected (for lock effects) */
  affectedTiles?: number[];
}

/**
 * Return type for useBossEffectExecutor
 */
export interface UseBossEffectExecutorReturn {
  /** Currently active timed effects */
  activeEffects: ActiveEffect[];
  /** Apply an array of effects */
  applyEffects: (effects: AbilityEffect[]) => void;
  /** Clear all active effects (unlocks tiles, etc.) */
  clearEffects: () => void;
}

// ==============================================
// CONSTANTS
// ==============================================

/** Default damage if not specified */
const DEFAULT_DAMAGE = 10;

/** Default timer penalty if not specified */
const DEFAULT_TIMER_PENALTY = 3;

// ==============================================
// HELPER FUNCTIONS
// ==============================================

/**
 * Get tile indices from target specification
 */
function getTargetIndices(target?: AbilityTarget): number[] {
  // Only 'specific' type has indices; all others are calculated by the game
  if (target?.type === 'specific') {
    return target.indices ?? [];
  }
  return [];
}

// ==============================================
// HOOK
// ==============================================

/**
 * Hook for executing boss ability effects
 *
 * @param callbacks - Callbacks for each effect type
 * @returns Effect executor functions and active effects state
 */
export function useBossEffectExecutor(
  callbacks: EffectCallbacks
): UseBossEffectExecutorReturn {
  // Track active timed effects
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);

  // Ref for callbacks to avoid stale closures
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // Ref for timers to clean up
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  /**
   * Apply a single effect
   */
  const applySingleEffect = useCallback((effect: AbilityEffect): ActiveEffect | null => {
    const now = Date.now();
    const cb = callbacksRef.current;

    switch (effect.type) {
      case 'player_damage': {
        const amount = (effect.params?.amount as number) ?? DEFAULT_DAMAGE;
        cb.onPlayerDamage?.(amount);
        cb.onScreenShake?.();
        cb.onDamageFlash?.();
        // Instant effect, no tracking needed
        return null;
      }

      case 'timer_penalty': {
        const seconds = (effect.params?.seconds as number) ?? DEFAULT_TIMER_PENALTY;
        cb.onTimerPenalty?.(seconds);
        // Instant effect, no tracking needed
        return null;
      }

      case 'lock_tiles': {
        const indices = getTargetIndices(effect.target);
        const duration = effect.duration ?? 5000;
        cb.onLockTiles?.(indices, duration);
        // Track for expiration
        return {
          effect,
          appliedAt: now,
          expiresAt: now + duration,
          affectedTiles: indices,
        };
      }

      case 'scramble': {
        cb.onScramble?.();
        cb.onScreenShake?.();
        // Instant effect, no tracking needed
        return null;
      }

      case 'change_tiles': {
        const indices = getTargetIndices(effect.target);
        const newLetters = (effect.params?.letters as string[]) ?? [];
        cb.onChangeTiles?.(indices, newLetters);
        // Instant effect, no tracking needed
        return null;
      }

      case 'spawn_special': {
        const type = (effect.params?.type as string) ?? 'bomb';
        const count = (effect.params?.count as number) ?? 1;
        cb.onSpawnSpecial?.(type, count);
        // Instant effect, no tracking needed
        return null;
      }

      case 'requirement': {
        const requirement = (effect.params?.requirement as string) ?? '';
        const duration = effect.duration ?? 10000;
        cb.onRequirement?.(requirement, duration);
        // Could track for UI display, but typically handled by game state
        return null;
      }

      case 'score_modifier': {
        const multiplier = (effect.params?.multiplier as number) ?? 0.5;
        const duration = effect.duration ?? 10000;
        cb.onScoreModifier?.(multiplier, duration);
        // Could track for UI display
        return null;
      }

      default:
        return null;
    }
  }, []);

  /**
   * Apply an array of effects
   */
  const applyEffects = useCallback((effects: AbilityEffect[]) => {
    const newActiveEffects: ActiveEffect[] = [];

    for (const effect of effects) {
      const activeEffect = applySingleEffect(effect);
      if (activeEffect) {
        newActiveEffects.push(activeEffect);

        // Set up expiration timer
        if (activeEffect.expiresAt) {
          const delay = activeEffect.expiresAt - Date.now();
          const timerId = setTimeout(() => {
            // Remove from active effects
            setActiveEffects((prev) =>
              prev.filter((e) => e !== activeEffect)
            );

            // Call cleanup callback (e.g., unlock tiles)
            if (activeEffect.effect.type === 'lock_tiles' && activeEffect.affectedTiles) {
              callbacksRef.current.onUnlockTiles?.(activeEffect.affectedTiles);
            }

            timersRef.current.delete(timerId as unknown as number);
          }, delay);

          timersRef.current.set(timerId as unknown as number, timerId);
        }
      }
    }

    if (newActiveEffects.length > 0) {
      setActiveEffects((prev) => [...prev, ...newActiveEffects]);
    }
  }, [applySingleEffect]);

  /**
   * Clear all active effects
   */
  const clearEffects = useCallback(() => {
    // Clear all expiration timers
    for (const timer of timersRef.current.values()) {
      clearTimeout(timer);
    }
    timersRef.current.clear();

    // Call cleanup for each active effect
    for (const activeEffect of activeEffects) {
      if (activeEffect.effect.type === 'lock_tiles' && activeEffect.affectedTiles) {
        callbacksRef.current.onUnlockTiles?.(activeEffect.affectedTiles);
      }
    }

    setActiveEffects([]);
  }, [activeEffects]);

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  return {
    activeEffects,
    applyEffects,
    clearEffects,
  };
}
