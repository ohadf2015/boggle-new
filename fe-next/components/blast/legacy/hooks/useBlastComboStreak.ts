'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// ==================== Constants ====================

/** Base combo window (2-letter min). Tighter for competitive play — rewards fast word-finding. */
export const COMBO_WINDOW_BASE_MS = 3000;

/** Compute combo window duration scaled by minimum word length.
 *  2-letter → 3s, 3-letter → 3.4s, 4-letter → 3.8s */
export function getComboWindowMs(minWordLength: number = 2): number {
  return COMBO_WINDOW_BASE_MS + Math.max(0, minWordLength - 2) * 400;
}
export const COMBO_TICK_MS = 50;
/** Lower multiplier per level — high combos still rewarding but require sustained play */
export const COMBO_MULTIPLIER_PER_LEVEL = 0.20;
export const MAX_COMBO_LEVEL = 10;

// ==================== Types ====================

export interface ComboStreakState {
  /** Current combo level (0 = no streak) */
  level: number;
  /** Whether a streak is currently running */
  isActive: boolean;
  /** Score multiplier: 1 + (level * 0.25) */
  multiplier: number;
}

export interface UseBlastComboStreakReturn {
  streak: ComboStreakState;
  /** Call when a word is submitted successfully */
  onWordSubmitted: () => void;
  /** Reset streak entirely */
  reset: () => void;
  /** Pause combo timer (call during cascades to prevent unfair decay) */
  pauseTimer: () => void;
  /** Resume combo timer after cascade ends */
  resumeTimer: () => void;
  /** Ref to the countdown arc SVG circle element — hook drives strokeDashoffset directly */
  arcRef: React.RefObject<SVGCircleElement | null>;
}

// ==================== Constants for arc rendering ====================

/** SVG circle radius (must match BlastComboStreakBadge) */
export const CIRCLE_RADIUS = 24;
export const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

// ==================== Helpers ====================

function computeMultiplier(level: number): number {
  return 1 + level * COMBO_MULTIPLIER_PER_LEVEL;
}

function makeInactiveState(): ComboStreakState {
  return { level: 0, isActive: false, multiplier: 1 };
}

// ==================== Hook ====================

/**
 * useBlastComboStreak — Tracks consecutive word submissions within a time window.
 *
 * Performance optimization: The countdown arc is driven via direct DOM mutation
 * (arcRef.strokeDashoffset) at 60fps using RAF, NOT via React state updates.
 * React state only changes when level or isActive changes (~once per word).
 * This eliminates ~3500 unnecessary re-renders per combo window.
 */
export function useBlastComboStreak(comboWindowMs: number = COMBO_WINDOW_BASE_MS): UseBlastComboStreakReturn {
  const [streak, setStreak] = useState<ComboStreakState>(makeInactiveState);

  // Refs to avoid stale closures inside RAF loop
  const rafRef = useRef<number | null>(null);
  const levelRef = useRef<number>(0);
  const windowEndRef = useRef<number>(0);
  /** Direct DOM ref for the SVG countdown arc — avoids React re-renders */
  const arcRef = useRef<SVGCircleElement | null>(null);
  /** Timestamp when timer was paused (0 = not paused) */
  const pausedAtRef = useRef<number>(0);
  /** Remaining time when paused (to restore on resume) */
  const pausedRemainingRef = useRef<number>(0);

  // ---- Cancel any running RAF loop ----
  const cancelLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // ---- Decay: reduce level by 1 on window expiry ----
  const scheduleDecay = useCallback(() => {
    const newLevel = levelRef.current - 1;
    levelRef.current = newLevel;

    if (newLevel <= 0) {
      levelRef.current = 0;
      windowEndRef.current = 0;
      // Set arc to empty
      if (arcRef.current) {
        arcRef.current.setAttribute('stroke-dashoffset', String(CIRCLE_CIRCUMFERENCE));
      }
      setStreak(makeInactiveState());
      return;
    }

    // Restart a fresh window for the remaining level
    windowEndRef.current = performance.now() + comboWindowMs;
    setStreak({
      level: newLevel,
      isActive: true,
      multiplier: computeMultiplier(newLevel),
    });
    startLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- RAF tick loop — drives arc via DOM, no React state ----
  function startLoop() {
    cancelLoop();

    function tick() {
      const now = performance.now();
      const remaining = Math.max(0, windowEndRef.current - now);

      // Drive the SVG arc directly via DOM — zero React re-renders
      if (arcRef.current) {
        const progress = remaining / comboWindowMs;
        arcRef.current.setAttribute(
          'stroke-dashoffset',
          String(CIRCLE_CIRCUMFERENCE * (1 - progress))
        );
      }

      if (remaining <= 0) {
        rafRef.current = null;
        scheduleDecay();
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
  }

  // ---- onWordSubmitted ----
  const onWordSubmitted = useCallback(() => {
    const newLevel = Math.min(levelRef.current + 1, MAX_COMBO_LEVEL);
    levelRef.current = newLevel;
    windowEndRef.current = performance.now() + comboWindowMs;

    // Reset arc to full
    if (arcRef.current) {
      arcRef.current.setAttribute('stroke-dashoffset', '0');
    }

    setStreak({
      level: newLevel,
      isActive: true,
      multiplier: computeMultiplier(newLevel),
    });

    startLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- pauseTimer: freeze combo countdown during cascades ----
  const pauseTimer = useCallback(() => {
    if (pausedAtRef.current > 0 || levelRef.current <= 0) return; // already paused or no streak
    pausedAtRef.current = performance.now();
    pausedRemainingRef.current = Math.max(0, windowEndRef.current - performance.now());
    cancelLoop();
  }, [cancelLoop]);

  // ---- resumeTimer: restore combo countdown after cascade ----
  const resumeTimer = useCallback(() => {
    if (pausedAtRef.current <= 0 || levelRef.current <= 0) return; // not paused or no streak
    windowEndRef.current = performance.now() + pausedRemainingRef.current;
    pausedAtRef.current = 0;
    pausedRemainingRef.current = 0;
    startLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- reset ----
  const reset = useCallback(() => {
    cancelLoop();
    levelRef.current = 0;
    windowEndRef.current = 0;
    if (arcRef.current) {
      arcRef.current.setAttribute('stroke-dashoffset', String(CIRCLE_CIRCUMFERENCE));
    }
    setStreak(makeInactiveState());
  }, [cancelLoop]);

  // ---- Cleanup on unmount ----
  useEffect(() => {
    return () => {
      cancelLoop();
    };
  }, [cancelLoop]);

  return { streak, onWordSubmitted, reset, arcRef, pauseTimer, resumeTimer };
}
