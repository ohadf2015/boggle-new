'use client';

import { useEffect, useRef } from 'react';
import type { EarthquakeState } from '../types';

interface UseEarthquakeEffectsOptions {
  earthquakeState: EarthquakeState;
  fireRoundActive: boolean;
  playEarthquakeRumble: () => void;
  playEarthquakeShake: () => void;
  playFireRoundStart: () => void;
  startFireCrackleLoop: () => void;
  stopFireCrackleLoop: () => void;
}

/**
 * Hook for managing earthquake and fire round sound effects and haptic feedback
 */
export function useEarthquakeEffects(options: UseEarthquakeEffectsOptions): void {
  const {
    earthquakeState,
    fireRoundActive,
    playEarthquakeRumble,
    playEarthquakeShake,
    playFireRoundStart,
    startFireCrackleLoop,
    stopFireCrackleLoop,
  } = options;

  // Track previous earthquake state to detect transitions
  const prevEarthquakeStateRef = useRef<EarthquakeState>('idle');
  const prevFireRoundActiveRef = useRef(false);

  useEffect(() => {
    const prevState = prevEarthquakeStateRef.current;
    const prevFireActive = prevFireRoundActiveRef.current;

    // Trigger sounds based on state transitions
    if (earthquakeState === 'warning' && prevState !== 'warning') {
      playEarthquakeRumble();
      // Haptic feedback for warning
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([150, 100, 150, 100, 200]);
      }
    } else if (earthquakeState === 'shaking' && prevState !== 'shaking') {
      playEarthquakeShake();
      // Haptic feedback for shake
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([300, 150, 300, 150, 400, 150, 300]);
      }
    }

    // Fire round start
    if (fireRoundActive && !prevFireActive) {
      playFireRoundStart();
      startFireCrackleLoop();
      // Haptic feedback for fire round
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(200);
      }
    }

    // Fire round end
    if (!fireRoundActive && prevFireActive) {
      stopFireCrackleLoop();
    }

    // Update refs for next comparison
    prevEarthquakeStateRef.current = earthquakeState;
    prevFireRoundActiveRef.current = fireRoundActive;
  }, [
    earthquakeState,
    fireRoundActive,
    playEarthquakeRumble,
    playEarthquakeShake,
    playFireRoundStart,
    startFireCrackleLoop,
    stopFireCrackleLoop,
  ]);
}
