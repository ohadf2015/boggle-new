/**
 * Power-Up Cooldown State Machine Hook
 *
 * Manages the lifecycle of a power-up through states:
 * ready -> activate() -> active -> cooldown (60s) -> ready
 *
 * Uses timestamp-based cooldown calculation to prevent drift.
 * Updates UI via 100ms interval for smooth countdown display.
 *
 * @param type - Type of power-up to manage
 * @returns Power-up state and activation function
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { POWER_UP_CONFIG, type PowerUpType, type PowerUp, type PowerUpState } from '../types/adventure';

const COOLDOWN_DURATION = 60; // seconds
const UI_UPDATE_INTERVAL = 100; // ms for smooth UI updates

interface UsePowerUpStateReturn {
  /** Current power-up state */
  powerUp: PowerUp;
  /** Activate the power-up (returns true if successful) */
  activate: () => boolean;
  /** Whether power-up is ready to use */
  isReady: boolean;
}

export function usePowerUpState(type: PowerUpType): UsePowerUpStateReturn {
  const effectDuration = POWER_UP_CONFIG[type].effectDuration;

  // State for triggering re-renders on UI updates
  const [state, setState] = useState<PowerUpState>('ready');
  const [remainingCooldown, setRemainingCooldown] = useState(0);

  // Refs to avoid re-renders on timestamp updates
  const activatedAtRef = useRef<number | undefined>(undefined);
  const effectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const uiUpdateIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  /**
   * Calculate remaining cooldown from timestamp (drift-free)
   */
  const calculateRemainingCooldown = useCallback((): number => {
    if (!activatedAtRef.current || state === 'ready') {
      return 0;
    }

    const elapsedMs = Date.now() - activatedAtRef.current;
    const elapsedSeconds = elapsedMs / 1000;

    // For active state, no cooldown yet
    if (state === 'active') {
      return 0;
    }

    // For cooldown state, calculate from activation time + effect duration
    const totalElapsed = elapsedSeconds - effectDuration;
    const remaining = Math.max(0, COOLDOWN_DURATION - totalElapsed);

    return remaining;
  }, [state, effectDuration]);

  /**
   * Update UI cooldown display
   */
  const updateUI = useCallback(() => {
    if (state === 'cooldown') {
      const remaining = calculateRemainingCooldown();
      setRemainingCooldown(remaining);

      // Transition to ready when cooldown complete
      if (remaining === 0) {
        setState('ready');
        activatedAtRef.current = undefined;
      }
    }
  }, [state, calculateRemainingCooldown]);

  /**
   * Start UI update interval for cooldown display
   */
  useEffect(() => {
    if (state === 'cooldown') {
      uiUpdateIntervalRef.current = setInterval(updateUI, UI_UPDATE_INTERVAL);
    }

    return () => {
      if (uiUpdateIntervalRef.current) {
        clearInterval(uiUpdateIntervalRef.current);
      }
    };
  }, [state, updateUI]);

  /**
   * Activate the power-up
   */
  const activate = useCallback((): boolean => {
    if (state !== 'ready') {
      return false; // Can only activate when ready
    }

    // Record activation timestamp
    activatedAtRef.current = Date.now();
    setState('active');

    // Handle instant vs duration-based power-ups
    if (effectDuration === 0) {
      // Instant power-up - transition to cooldown immediately
      effectTimeoutRef.current = setTimeout(() => {
        setState('cooldown');
        setRemainingCooldown(COOLDOWN_DURATION);
      }, 0);
    } else {
      // Duration-based power-up - wait for effect duration
      effectTimeoutRef.current = setTimeout(() => {
        setState('cooldown');
        setRemainingCooldown(COOLDOWN_DURATION);
      }, effectDuration * 1000);
    }

    return true;
  }, [state, effectDuration]);

  /**
   * Cleanup timeouts on unmount
   */
  useEffect(() => {
    return () => {
      if (effectTimeoutRef.current) {
        clearTimeout(effectTimeoutRef.current);
      }
      if (uiUpdateIntervalRef.current) {
        clearInterval(uiUpdateIntervalRef.current);
      }
    };
  }, []);

  // Build power-up object
  const powerUp: PowerUp = {
    type,
    state,
    remainingCooldown,
    totalCooldown: COOLDOWN_DURATION,
    activatedAt: activatedAtRef.current,
    effectDuration,
  };

  return {
    powerUp,
    activate,
    isReady: state === 'ready',
  };
}
