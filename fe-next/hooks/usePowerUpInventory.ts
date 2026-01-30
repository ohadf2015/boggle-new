/**
 * Power-Up Inventory Hook
 *
 * Manages persistent power-up state across levels using localStorage.
 * Tracks unlock status and cooldown timestamps for all power-ups.
 *
 * In v2.0, all power-ups are unlocked by default.
 * Future versions may implement unlock gating.
 *
 * Cooldown tracking uses timestamps (not remaining seconds) for accuracy.
 * This prevents drift from tab switching or sleep mode.
 */

import { useState, useEffect, useCallback } from 'react';
import type { PowerUpType } from '../types/adventure';

const STORAGE_KEY = 'power-up-inventory';
const COOLDOWN_DURATION = 60; // seconds (matches usePowerUpState)

/**
 * Power-Up Inventory State
 */
export interface PowerUpInventory {
  /** Unlock status (all true by default for v2.0) */
  freezeTimeUnlocked: boolean;
  hintUnlocked: boolean;
  scoreMultiplierUnlocked: boolean;
  /** Cooldown timestamps (0 = ready, timestamp = when cooldown started) */
  cooldownStartedAt: {
    freezeTime: number;
    hint: number;
    scoreMultiplier: number;
  };
}

/**
 * Default inventory state (all unlocked, no cooldowns)
 */
const DEFAULT_INVENTORY: PowerUpInventory = {
  freezeTimeUnlocked: true,
  hintUnlocked: true,
  scoreMultiplierUnlocked: true,
  cooldownStartedAt: {
    freezeTime: 0,
    hint: 0,
    scoreMultiplier: 0,
  },
};

/**
 * Hook return type
 */
interface UsePowerUpInventoryReturn {
  /** Current inventory state */
  inventory: PowerUpInventory;
  /** Check if power-up is unlocked */
  isUnlocked: (type: PowerUpType) => boolean;
  /** Start cooldown for power-up (sets timestamp) */
  startCooldown: (type: PowerUpType) => void;
  /** Get remaining cooldown in seconds (0 if ready) */
  getCooldownRemaining: (type: PowerUpType) => number;
  /** Reset all cooldowns (for level transitions) */
  resetCooldowns: () => void;
}

/**
 * Load inventory from localStorage or return default
 */
function loadInventory(): PowerUpInventory {
  if (typeof window === 'undefined') {
    return DEFAULT_INVENTORY;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_INVENTORY;
    }

    const parsed = JSON.parse(stored);
    return {
      ...DEFAULT_INVENTORY,
      ...parsed,
    };
  } catch {
    return DEFAULT_INVENTORY;
  }
}

/**
 * Save inventory to localStorage
 */
function saveInventory(inventory: PowerUpInventory): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Power-Up Inventory Hook
 *
 * Manages persistent power-up state across levels.
 * All power-ups unlocked by default in v2.0.
 * Cooldowns use timestamps for accuracy (no drift).
 *
 * @returns Inventory state and management functions
 */
export function usePowerUpInventory(): UsePowerUpInventoryReturn {
  const [inventory, setInventory] = useState<PowerUpInventory>(() => loadInventory());

  // Persist to localStorage whenever inventory changes
  useEffect(() => {
    saveInventory(inventory);
  }, [inventory]);

  /**
   * Check if power-up is unlocked
   */
  const isUnlocked = useCallback(
    (type: PowerUpType): boolean => {
      switch (type) {
        case 'freezeTime':
          return inventory.freezeTimeUnlocked;
        case 'hint':
          return inventory.hintUnlocked;
        case 'scoreMultiplier':
          return inventory.scoreMultiplierUnlocked;
        default:
          return false;
      }
    },
    [inventory]
  );

  /**
   * Start cooldown for power-up (sets timestamp to Date.now())
   */
  const startCooldown = useCallback((type: PowerUpType): void => {
    setInventory(prev => ({
      ...prev,
      cooldownStartedAt: {
        ...prev.cooldownStartedAt,
        [type]: Date.now(),
      },
    }));
  }, []);

  /**
   * Get remaining cooldown in seconds (0 if ready)
   * Calculates from timestamp for drift-free accuracy
   */
  const getCooldownRemaining = useCallback(
    (type: PowerUpType): number => {
      const timestamp = inventory.cooldownStartedAt[type];

      // No cooldown active
      if (timestamp === 0) {
        return 0;
      }

      // Calculate elapsed time
      const elapsedMs = Date.now() - timestamp;
      const elapsedSeconds = elapsedMs / 1000;

      // Calculate remaining time
      const remaining = Math.max(0, COOLDOWN_DURATION - elapsedSeconds);

      return remaining;
    },
    [inventory.cooldownStartedAt]
  );

  /**
   * Reset all cooldowns (for level transitions)
   * Recommended by research for better UX
   */
  const resetCooldowns = useCallback((): void => {
    setInventory(prev => ({
      ...prev,
      cooldownStartedAt: {
        freezeTime: 0,
        hint: 0,
        scoreMultiplier: 0,
      },
    }));
  }, []);

  return {
    inventory,
    isUnlocked,
    startCooldown,
    getCooldownRemaining,
    resetCooldowns,
  };
}
